import { SearchEngine } from "searchfn";
import { extractSearchFields } from "../../utils/textUtils";


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
  let dataStr = "";
  if (data !== undefined) {
    try {
      dataStr = ": " + JSON.stringify(data);
    } catch {
      dataStr = ": <unserializable>";
    }
  }
  const logEntry = `[${new Date().toISOString()}] ${message}${dataStr}`;
  console.log(logEntry);
  workerLogs.push(logEntry);
  if (workerLogs.length > 1000) workerLogs.shift();

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
    logToMain("[Worker] Starting indexing", {
      dbVersion: task.dbVersion,
      tableCount: task.tables?.length
    });

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

    const useSearchfn = (task.indexMethod ?? "searchfn") !== "custom";
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
        db.close();
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
  const transaction = db.transaction([table.name], "readonly");
  const objectStore = transaction.objectStore(table.name);

  if (useSearchfn) {
    await indexWithSearchfn(objectStore, table, userId, dbVersion, port);
  } else {
    await indexWithCustomLogic(objectStore, table, userId, dbVersion, port);
  }
}

async function streamObjectStore(
  objectStore: IDBObjectStore,
  batchSize: number,
  onBatch: (records: any[]) => Promise<void>
) {
  let batch: any[] = [];

  for await (const record of iterateObjectStore(objectStore)) {
    batch.push(record);
    if (batch.length >= batchSize) {
      const currentBatch = batch;
      batch = [];
      await onBatch(currentBatch);
    }
  }

  if (batch.length > 0) {
    await onBatch(batch);
  }
}

async function* iterateObjectStore(
  objectStore: IDBObjectStore
): AsyncGenerator<any, void, void> {
  const request = objectStore.openCursor();
  let resolveNext: ((value: IDBCursorWithValue | null) => void) | null = null;
  let rejectNext: ((reason?: any) => void) | null = null;
  let finished = false;

  request.onerror = () => {
    if (finished) return;
    finished = true;
    if (rejectNext) {
      rejectNext(request.error ?? new Error("Cursor iteration failed"));
    }
  };

  request.onsuccess = () => {
    if (finished) return;
    if (resolveNext) {
      const cursor = request.result ?? null;
      const resolve = resolveNext;
      resolveNext = null;
      rejectNext = null;
      resolve(cursor);
    }
  };

  try {
    while (true) {
      const cursor = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
        resolveNext = resolve;
        rejectNext = reject;
      });

      if (!cursor) {
        finished = true;
        break;
      }

      yield cursor.value;
      cursor.continue();
    }
  } finally {
    finished = true;
  }
}

async function indexWithSearchfn(
  objectStore: IDBObjectStore,
  table: { name: string; searchIndices: string[] },
  userId: string,
  dbVersion: number,
  port: MessagePort
) {
  const indexDbName = `${userId}-${dbVersion}-${table.name}-search`;

  const searchEngine = new SearchEngine({
    name: indexDbName,
    fields: table.searchIndices,
    pipeline: {
      enableStemming: true,
      language: "en"
    },
    cache: {
      terms: 2048,
      vectors: 512
    }
  });

  await searchEngine.clear();

  logToMain(`Starting streaming indexing for table ${table.name}`);

  const batchSize = 1000;
  const initialIndexed = currentProgress.indexedRecords;
  let processedCount = 0;

  await streamObjectStore(objectStore, batchSize, async (batch) => {
    const addPromises: Promise<unknown>[] = [];

    for (const record of batch) {
      const fields = extractSearchFields(record, table.searchIndices);
      if (!record?.id || !fields) continue;
      addPromises.push(Promise.resolve(searchEngine.add({ id: record.id, fields })));
    }

    const results = await Promise.allSettled(addPromises);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    processedCount += succeeded;

    currentProgress.indexedRecords = initialIndexed + processedCount;
    currentProgress.progress =
      currentProgress.totalRecords > 0
        ? Math.floor((currentProgress.indexedRecords / currentProgress.totalRecords) * 100)
        : 100;

    broadcastProgress(port);

    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  logToMain(
    `searchfn indexing completed for table ${table.name}: ${processedCount} records indexed`
  );
}

async function indexWithCustomLogic(
  objectStore: IDBObjectStore,
  table: { name: string; searchIndices: string[] },
  userId: string,
  dbVersion: number,
  port: MessagePort
) {
  const searchIndex: Map<string, Set<string>> = new Map();
  const recordTexts: Map<string, string> = new Map();

  const batchSize = 100;
  const initialIndexed = currentProgress.indexedRecords;
  let processedCount = 0;
  let batchCounter = 0;

  await streamObjectStore(objectStore, batchSize, async (batch) => {
    batchCounter += 1;

    for (const record of batch) {
      const text = extractFlatText(record, table.searchIndices);
      if (record.id && text) {
        recordTexts.set(record.id, text);

        const tokens = text
          .toLowerCase()
          .split(/[\s\-\_\,\.\;\:\!\?\(\)\[\]\{\}\/\\]+/);

        for (const token of tokens) {
          if (token.length > 1) {
            if (!searchIndex.has(token)) {
              searchIndex.set(token, new Set());
            }
            searchIndex.get(token)!.add(record.id);
          }
        }
      }
    }

    processedCount += batch.length;
    currentProgress.indexedRecords = initialIndexed + processedCount;
    currentProgress.progress =
      currentProgress.totalRecords > 0
        ? Math.floor((currentProgress.indexedRecords / currentProgress.totalRecords) * 100)
        : 100;

    if (batchCounter % 5 === 0) {
      broadcastProgress(port);
    }
  });

  broadcastProgress(port);

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
