import { SearchEngine } from "searchfn";

const searchfnAvailable = true;

console.log("[Worker] searchfn SearchEngine imported from local package");

interface IndexingTask {
  userId: string;
  dbVersion: number;
  indexMethod?: "flexsearch" | "custom";
  tables: Array<{
    name: string;
    indices: string[];
    searchIndices: string[];
  }>;
}

interface WorkerMessage {
  type: "START_INDEXING" | "GET_PROGRESS";
  payload?: IndexingTask;
}

interface ProgressMessage {
  type: "PROGRESS" | "COMPLETE" | "ERROR";
  payload: {
    progress?: number;
    totalRecords?: number;
    indexedRecords?: number;
    currentTable?: string;
    error?: string;
  };
}

let isIndexing = false;
let currentProgress = {
  totalRecords: 0,
  indexedRecords: 0,
  currentTable: null as string | null,
  progress: 0
};

const ports: MessagePort[] = [];
const workerLogs: string[] = [];
const isForwardLogs = false;
function logToMain(message: string, data?: any) {
  const logEntry = `[${new Date().toISOString()}] ${message}${
    data ? ": " + JSON.stringify(data) : ""
  }`;
  console.log(logEntry);
  workerLogs.push(logEntry);

  // Broadcast log to all connected ports
  if (isForwardLogs) {
    ports.forEach((port) => {
      try {
        port.postMessage({
          type: "LOG",
          payload: { message, data, timestamp: new Date().toISOString() }
        });
      } catch (e) {
        // Ignore if port is closed
      }
    });
  }
}

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  ports.push(port);

  port.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    switch (type) {
      case "START_INDEXING":
        if (isIndexing) {
          port.postMessage({
            type: "ERROR",
            payload: { error: "Indexing already in progress" }
          } as ProgressMessage);
          return;
        }
        if (payload) {
          await startIndexing(payload, port);
        }
        break;

      case "GET_PROGRESS":
        port.postMessage({
          type: "PROGRESS",
          payload: currentProgress
        } as ProgressMessage);
        break;
    }
  };

  port.start();
};

async function startIndexing(task: IndexingTask, port: MessagePort) {
  isIndexing = true;
  currentProgress = {
    totalRecords: 0,
    indexedRecords: 0,
    currentTable: null,
    progress: 0
  };

  let db: IDBDatabase | null = null;

  try {
    console.log("[Worker] Starting indexing with task:", task);

    const dbName = `${task.userId}-${task.dbVersion}`;
    console.log("[Worker] Opening IndexedDB database:", dbName);

    // Open IndexedDB directly
    const openRequest = indexedDB.open(dbName);

    db = await new Promise<IDBDatabase>((resolve, reject) => {
      openRequest.onsuccess = () => {
        console.log("[Worker] Database opened successfully");
        resolve(openRequest.result);
      };
      openRequest.onerror = () => {
        reject(
          new Error(`Failed to open database: ${openRequest.error?.message}`)
        );
      };
    });

    const tablesToIndex = task.tables.filter(
      (table) => table.searchIndices && table.searchIndices.length > 0
    );

    // Calculate total records
    let totalRecordsToIndex = 0;
    for (const table of tablesToIndex) {
      const transaction = db.transaction([table.name], "readonly");
      const objectStore = transaction.objectStore(table.name);
      const countRequest = objectStore.count();

      const count = await new Promise<number>((resolve) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => resolve(0);
      });

      totalRecordsToIndex += count;
    }

    currentProgress.totalRecords = totalRecordsToIndex;
    broadcastProgress(port);

    // Use searchfn if requested (it's already loaded)
    const useSearchfn = task.indexMethod === "flexsearch" && searchfnAvailable;
    logToMain("Using indexing method", {
      method: useSearchfn ? "searchfn" : "custom"
    });

    // Process each table
    for (const table of tablesToIndex) {
      currentProgress.currentTable = table.name;
      await indexTable(
        db,
        table,
        task.userId,
        task.dbVersion,
        useSearchfn,
        port
      );
    }

    if (db) {
      db.close();
      console.log("[Worker] Database closed");
    }

    currentProgress.progress = 100;
    isIndexing = false;

    port.postMessage({
      type: "COMPLETE",
      payload: currentProgress
    } as ProgressMessage);
  } catch (error) {
    console.error("[Worker] Error during indexing:", error);
    isIndexing = false;

    let errorMessage = "Unknown error during indexing";
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.stack) {
        console.error("[Worker] Error stack:", error.stack);
      }
    }

    if (db) {
      try {
        await db.close();
      } catch (closeError) {
        console.error("[Worker] Error closing database:", closeError);
      }
    }

    port.postMessage({
      type: "ERROR",
      payload: {
        error: errorMessage
      }
    } as ProgressMessage);
  }
}

async function indexTable(
  db: IDBDatabase,
  table: { name: string; searchIndices: string[] },
  userId: string,
  dbVersion: number,
  useSearchfn: boolean,
  port: MessagePort
) {
  // Get all records from the table using native IndexedDB
  const transaction = db.transaction([table.name], "readonly");
  const objectStore = transaction.objectStore(table.name);
  const getAllRequest = objectStore.getAll();

  const records = await new Promise<any[]>((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result || []);
    };
    getAllRequest.onerror = () => {
      console.error("[Worker] Error getting records:", getAllRequest.error);
      resolve([]);
    };
  });

  console.log(
    `[Worker] Processing ${records.length} records from table ${
      table.name
    } using ${useSearchfn ? "searchfn" : "custom"} indexing`
  );

  if (useSearchfn) {
    await indexWithSearchfn(records, table, userId, dbVersion, port);
  } else {
    await indexWithCustomLogic(records, table, userId, dbVersion, port);
  }
}

async function indexWithSearchfn(
  records: any[],
  table: { name: string; searchIndices: string[] },
  userId: string,
  dbVersion: number,
  port: MessagePort
) {
  const indexDbName = `${userId}-${dbVersion}-${table.name}-search`;

  const searchEngine = new SearchEngine({
    name: indexDbName,
    fields: table.searchIndices, // Use actual field names
    pipeline: {
      enableStemming: true,
      language: "en"
    },
    cache: {
      terms: 2048,
      vectors: 512
    }
  });

  // Clear existing index to avoid duplicates
  await searchEngine.clear();

  logToMain(
    `Starting bulk indexing for table ${table.name}: ${records.length} records`
  );

  // Optimized approach: Larger batches with concurrent processing
  // searchfn's persistPostings() only saves dirty postings, so this is efficient
  const batchSize = 1000; // Process 1000 records at a time
  let processedCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, Math.min(i + batchSize, records.length));

    // Build all promises for this batch using flatMap
    const indexPromises = batch.flatMap((record) => {
      const fields = extractSearchFields(record, table.searchIndices);
      if (!record.id || !fields) return [];

      return searchEngine.add({
        id: record.id,
        fields
      });
    });

    // Process entire batch concurrently
    await Promise.all(indexPromises);

    processedCount += batch.length;
    currentProgress.indexedRecords = processedCount;
    currentProgress.progress =
      currentProgress.totalRecords > 0
        ? Math.floor((processedCount / currentProgress.totalRecords) * 100)
        : 100;

    // Broadcast progress every batch (already efficient with large batches)
    broadcastProgress(port);

    // Brief yield to prevent blocking
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  logToMain(
    `searchfn indexing completed for table ${table.name}: ${processedCount} records indexed`
  );
}

async function indexWithCustomLogic(
  records: any[],
  table: { name: string; searchIndices: string[] },
  userId: string,
  dbVersion: number,
  port: MessagePort
) {
  // Build search index in memory
  const searchIndex: Map<string, Set<string>> = new Map(); // term -> set of record IDs
  const recordTexts: Map<string, string> = new Map(); // record ID -> extracted text

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, Math.min(i + batchSize, records.length));

    for (const record of batch) {
      const text = extractFlatText(record, table.searchIndices);
      if (record.id && text) {
        // Store the text for this record
        recordTexts.set(record.id, text);

        // Simple tokenization - split by whitespace and punctuation
        const tokens = text
          .toLowerCase()
          .split(/[\s\-\_\,\.\;\:\!\?\(\)\[\]\{\}\/\\]+/);

        for (const token of tokens) {
          if (token.length > 1) {
            // Skip single characters
            if (!searchIndex.has(token)) {
              searchIndex.set(token, new Set());
            }
            searchIndex.get(token)!.add(record.id);
          }
        }
      }
    }

    currentProgress.indexedRecords += batch.length;
    currentProgress.progress =
      currentProgress.totalRecords > 0
        ? Math.floor(
            (currentProgress.indexedRecords / currentProgress.totalRecords) *
              100
          )
        : 100;

    if (i % (batchSize * 5) === 0) {
      broadcastProgress(port);
    }
  }

  // Store the index in IndexedDB for later retrieval
  await storeCustomSearchIndex(
    table.name,
    searchIndex,
    recordTexts,
    userId,
    dbVersion
  );
}

async function storeCustomSearchIndex(
  tableName: string,
  searchIndex: Map<string, Set<string>>,
  recordTexts: Map<string, string>,
  userId: string,
  dbVersion: number
) {
  // Store the search index in a separate IndexedDB database
  const indexDbName = `${userId}-${dbVersion}-${tableName}-search-index`;

  // Open or create the index database
  const openRequest = indexedDB.open(indexDbName, 1);

  return new Promise<void>((resolve, reject) => {
    openRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores for the index
      if (!db.objectStoreNames.contains("terms")) {
        db.createObjectStore("terms", { keyPath: "term" });
      }
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "id" });
      }
    };

    openRequest.onsuccess = async () => {
      const db = openRequest.result;

      try {
        // Store terms and their document IDs
        const transaction = db.transaction(["terms", "documents"], "readwrite");
        const termsStore = transaction.objectStore("terms");
        const docsStore = transaction.objectStore("documents");

        // Store each term with its document IDs
        for (const [term, docIds] of searchIndex.entries()) {
          await new Promise<void>((res, rej) => {
            const putReq = termsStore.put({
              term,
              documentIds: Array.from(docIds)
            });
            putReq.onsuccess = () => res();
            putReq.onerror = () => rej(putReq.error);
          });
        }

        // Store document texts for snippet generation
        for (const [id, text] of recordTexts.entries()) {
          await new Promise<void>((res, rej) => {
            const putReq = docsStore.put({ id, text });
            putReq.onsuccess = () => res();
            putReq.onerror = () => rej(putReq.error);
          });
        }

        db.close();
        resolve();
      } catch (error) {
        db.close();
        reject(error);
      }
    };

    openRequest.onerror = () => {
      reject(openRequest.error);
    };
  });
}

function cleanText(text: string): string {
  return text
    .replace(/\(resource=\w+:[a-zA-Z0-9_-]+\)/g, "")
    .replace(/\b\w+:[a-zA-Z0-9_-]+\b/g, "")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^===+$/gm, "")
    .replace(/[​\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function extractSearchFields(
  record: any,
  searchIndices: string[]
): Record<string, string> | undefined {
  try {
    const fields: Record<string, string> = {};
    let hasContent = false;

    for (const fieldName of searchIndices) {
      const value = record[fieldName];
      if (value != null && value !== "") {
        const cleanedValue = cleanText(String(value));
        if (cleanedValue && cleanedValue.length > 0) {
          fields[fieldName] = cleanedValue;
          hasContent = true;
        }
      }
    }

    return hasContent ? fields : undefined;
  } catch (e) {
    console.error("[Worker] Error extracting search fields:", e);
    return undefined;
  }
}

// Keep for backward compatibility with custom indexing
function extractFlatText(
  record: any,
  searchIndices: string[]
): string | undefined {
  const fields = extractSearchFields(record, searchIndices);
  if (!fields) return undefined;
  return Object.values(fields).join(" ").trim();
}

function broadcastProgress(port: MessagePort) {
  port.postMessage({
    type: "PROGRESS",
    payload: currentProgress
  } as ProgressMessage);
}
