import { Product } from "@nucleum/schema/product.type";
import { productRegistry } from "@nucleum/schema/product.config";

import {
  type LegacyLocalDataIdentity,
  type LegacyLocalDataProvider,
  type LegacyLocalStoreSummary,
  type LegacyLocalStoreBackup,
  type LegacyLocalRecordBackup
} from "./types";
import { serializeIndexedDbValue } from "@nucleum/persistence/legacy-backup/serialized-value";

type IndexedDbDescriptor = {
  name?: string;
  version?: number;
};

type IndexedDbRawRecord = {
  key: IDBValidKey;
  value: unknown;
};

type IndexedDbWithDatabases = IDBFactory & {
  databases?: () => Promise<IndexedDbDescriptor[]>;
};

const currentDatafnDbPrefix = "nucleum-datafn-";

const ignoredDatabaseNames = new Set([
  "tidigit-sheet-storage",
  "nucleum-datafn-search-bootstrap"
]);

export const legacyResourceStores = new Set([
  "kv",
  "goal",
  "PointGoal",
  "PointTask",
  "PointSession",
  "PointLog",
  "todo",
  "collection",
  "property",
  "view",
  "node",
  "file",
  "link",
  "nodelinks",
  "linkTag",
  "mutation",
  "tz",
  "objective",
  "task",
  "session",
  "sessionLog",
  "capture",
  "space",
  "combination",
  "event"
]);

export const fallbackLegacyDatabaseName = "nativeone";

export function shouldIgnoreDatabase(name: string) {
  return (
    ignoredDatabaseNames.has(name) || name.startsWith(currentDatafnDbPrefix)
  );
}

export function resolveLegacyLocalDataProvider(
  product: Product,
  name: string,
  storeNames: string[],
  identity: LegacyLocalDataIdentity
): LegacyLocalDataProvider | undefined {
  const databaseName =
    productRegistry[product]?.databaseName ?? fallbackLegacyDatabaseName;
  if (name === databaseName) return "surreal";
  if (name.startsWith(`${databaseName}_`)) return "indexeddb";
  if (
    isActiveIdentityDexieDatabase(name, identity) &&
    hasLegacyResourceStore(storeNames)
  ) {
    return "dexie";
  }
  if (
    name.toLowerCase().includes("surreal") &&
    hasLegacyResourceStore(storeNames)
  ) {
    return "surreal";
  }
  return undefined;
}

function hasLegacyResourceStore(storeNames: string[]) {
  return storeNames.some((storeName) => legacyResourceStores.has(storeName));
}

function isActiveIdentityDexieDatabase(
  name: string,
  identity: LegacyLocalDataIdentity
) {
  const candidates = [identity.userId, identity.dapId].filter(
    (value): value is string => Boolean(value)
  );
  return candidates.some((value) => name === `${value}-1`);
}

export function resolveLegacyIndexedDbFallbackDescriptors(
  product: Product,
  identity: LegacyLocalDataIdentity
): IndexedDbDescriptor[] {
  const databaseName =
    productRegistry[product]?.databaseName ?? fallbackLegacyDatabaseName;
  const identityIds = [identity.userId, identity.dapId].filter(
    (value): value is string => Boolean(value)
  );
  const names = new Set([
    databaseName,
    ...identityIds.map((value) => `${databaseName}_${value}`),
    ...identityIds.map((value) => `${value}-1`)
  ]);
  return Array.from(names, (name) => ({ name }));
}

export async function listExistingIndexedDatabases() {
  if (typeof indexedDB === "undefined") return undefined;
  const indexedDb = indexedDB as IndexedDbWithDatabases;
  if (typeof indexedDb.databases !== "function") return undefined;
  return indexedDb.databases().catch(() => undefined);
}

export function openExistingIndexedDatabase(
  name: string
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to open ${name}`));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      reject(new Error(`Database ${name} does not exist`));
    };
  });
}

export async function readStoreSummaries(
  database: IDBDatabase,
  storeNames: string[]
): Promise<LegacyLocalStoreSummary[]> {
  if (!storeNames.length) return [];
  const transaction = database.transaction(storeNames, "readonly");
  return Promise.all(
    storeNames.map((name) =>
      countStoreRecords(transaction.objectStore(name))
        .then((count) => ({
          name,
          count
        }))
        .catch((error) => ({
          name,
          count: 0,
          error: error instanceof Error ? error.message : String(error)
        }))
    )
  );
}

export async function readStoreBackups(
  database: IDBDatabase,
  storeNames: string[]
): Promise<LegacyLocalStoreBackup[]> {
  if (!storeNames.length) return [];
  const transaction = database.transaction(storeNames, "readonly");
  return Promise.all(
    storeNames.map(async (name) => {
      const store = transaction.objectStore(name);
      const backup: LegacyLocalStoreBackup = {
        name,
        keyPath: normalizeKeyPath(store.keyPath),
        autoIncrement: store.autoIncrement,
        indexes: Array.from(store.indexNames).map((indexName) => {
          const index = store.index(indexName);
          return {
            name: index.name,
            keyPath: normalizeKeyPath(index.keyPath),
            multiEntry: index.multiEntry,
            unique: index.unique
          };
        }),
        records: []
      };
      try {
        backup.records = await readStoreRecords(store);
      } catch (error) {
        backup.error = error instanceof Error ? error.message : String(error);
      }
      return backup;
    })
  );
}

function countStoreRecords(store: IDBObjectStore): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to count ${store.name}`));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

async function readStoreRecords(
  store: IDBObjectStore
): Promise<LegacyLocalRecordBackup[]> {
  const records = await readRawStoreRecords(store);
  return Promise.all(
    records.map(async (record) => ({
      key: await serializeIndexedDbValue(record.key),
      value: await serializeIndexedDbValue(record.value)
    }))
  );
}

function readRawStoreRecords(
  store: IDBObjectStore
): Promise<IndexedDbRawRecord[]> {
  return new Promise((resolve, reject) => {
    const records: IndexedDbRawRecord[] = [];
    const request = store.openCursor();
    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to read ${store.name}`));
    };
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(records);
        return;
      }
      records.push({
        key: cursor.primaryKey,
        value: cursor.value
      });
      cursor.continue();
    };
  });
}

function normalizeKeyPath(keyPath: string | string[] | null) {
  if (keyPath === null || typeof keyPath === "string") return keyPath;
  return Array.isArray(keyPath) ? [...keyPath] : String(keyPath);
}
