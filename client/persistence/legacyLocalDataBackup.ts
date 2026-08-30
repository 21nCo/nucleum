import { Product } from "@21n/products/product.type";
import { productRegistry } from "@21n/shared-config/product.config";
import { nucleumDatafnSchema } from "@21n/shared-data/datafn/schema.datafn";
import { parse } from "@21n/shared-utils/json.utils";
import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { clientStorage } from "@21n/persistence/persistence.utils";

export type LegacyLocalDataProvider = "dexie" | "indexeddb" | "surreal";

export type LegacyLocalStoreSummary = {
  name: string;
  count: number;
  error?: string;
};

export type LegacyLocalDatabaseSummary = {
  name: string;
  version: number;
  provider: LegacyLocalDataProvider;
  stores: LegacyLocalStoreSummary[];
};

export type LegacyLocalDataSummary = {
  isSupported: boolean;
  databases: LegacyLocalDatabaseSummary[];
};

export type LegacyLocalDataBackup = {
  schema: "nucleum-legacy-local-data-backup";
  version: 1;
  exportedAt: string;
  product: string;
  databases: LegacyLocalDatabaseBackup[];
};

export type LegacyLocalDatabaseBackup = {
  name: string;
  version: number;
  provider: LegacyLocalDataProvider;
  stores: LegacyLocalStoreBackup[];
};

export type LegacyLocalStoreBackup = {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: LegacyLocalIndexBackup[];
  records: LegacyLocalRecordBackup[];
  error?: string;
};

export type LegacyLocalIndexBackup = {
  name: string;
  keyPath: string | string[] | null;
  multiEntry: boolean;
  unique: boolean;
};

export type LegacyLocalRecordBackup = {
  key: unknown;
  value: unknown;
};

export type LegacyLocalDataRecoveryAction =
  "import_old_data" | "download_backup_continue";

export type LegacyLocalDataRecoveryDecision = {
  version: 1;
  product: Product;
  identity: string;
  sourceDatabases: string[];
  action: LegacyLocalDataRecoveryAction;
  decidedAt: string;
  sourceRecordCount: number;
  backupExportedAt?: string;
  importedResourceCount?: number;
  importedJoinCount?: number;
};

export type LegacyDatafnImportPayload = {
  version: 1;
  exportedAt: string;
  schema: Array<{ name: string; version: number }>;
  resources: Record<string, Array<Record<string, unknown>>>;
  joins?: Record<string, Array<Record<string, unknown>>>;
  kv?: Record<string, unknown>;
};

type LegacyLocalDataIdentity = {
  userId?: string;
  dapId?: string;
};

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

const serializationTypeKey = "__legacyIndexedDbType";
const currentDatafnDbPrefix = "nucleum-datafn-";
const ignoredDatabaseNames = new Set([
  "tidigit-sheet-storage",
  "nucleum-datafn-search-bootstrap"
]);
const legacyResourceStores = new Set([
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

const fallbackLegacyDatabaseName = "nativeone";
const resourceCapabilityFields = new Set([
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "trashedAt",
  "trashedBy",
  "isArchived",
  "visibility"
]);
const joinCapabilityFields = new Set([
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy"
]);
const legacyResourceMap = new Map<string, string>([
  ["goal", "objective"],
  ["PointGoal", "objective"],
  ["objective", "objective"],
  ["todo", "task"],
  ["PointTask", "task"],
  ["task", "task"],
  ["PointSession", "session"],
  ["session", "session"],
  ["PointLog", "sessionLog"],
  ["sessionLog", "sessionLog"],
  ["collection", "collection"],
  ["property", "property"],
  ["view", "view"],
  ["node", "node"],
  ["file", "file"],
  ["capture", "capture"],
  ["space", "space"],
  ["combination", "space"],
  ["event", "event"],
  ["linkTag", "linkTag"]
]);
const recordLinkResources = new Set(["node", "objective", "task", "event"]);
const collectionItemResources = new Set(["node", "objective"]);
const propertyValueResources = new Set(["node", "objective"]);
const sessionItemResources = new Set(["objective", "task"]);
const schemaResources = nucleumDatafnSchema.resources.filter(
  (resource) => !("isRemoteOnly" in resource && resource.isRemoteOnly === true)
);
type SchemaResourceName = (typeof schemaResources)[number]["name"];
const schemaResourceNames: ReadonlySet<SchemaResourceName> = new Set(
  schemaResources.map((resource) => resource.name)
);
const schemaFieldsByResource: ReadonlyMap<
  SchemaResourceName,
  ReadonlySet<string>
> = new Map(
  schemaResources.map((resource) => [
    resource.name,
    new Set([
      ...resource.fields.map((field) => field.name),
      ...resourceCapabilityFields
    ])
  ])
);

/**
 * Detects legacy local IndexedDB databases without creating new databases.
 */
export async function detectLegacyLocalData(
  product: Product
): Promise<LegacyLocalDataSummary> {
  if (typeof indexedDB === "undefined") {
    return { isSupported: false, databases: [] };
  }

  const databases: LegacyLocalDatabaseSummary[] = [];
  const identity = await resolveActiveLegacyLocalDataIdentity();
  const descriptors =
    (await listExistingIndexedDatabases()) ??
    resolveLegacyIndexedDbFallbackDescriptors(product, identity);
  for (const descriptor of descriptors) {
    const name = descriptor.name;
    if (!name || shouldIgnoreDatabase(name)) continue;
    const database = await openExistingIndexedDatabase(name).catch(() => null);
    if (!database) continue;
    try {
      const storeNames = Array.from(database.objectStoreNames);
      const provider = resolveLegacyLocalDataProvider(
        product,
        name,
        storeNames,
        identity
      );
      if (!provider) continue;
      const stores = await readStoreSummaries(database, storeNames);
      databases.push({
        name,
        version: database.version,
        provider,
        stores
      });
    } finally {
      database.close();
    }
  }

  return { isSupported: true, databases };
}

/**
 * Exports raw legacy local IndexedDB data for later manual recovery/import.
 */
export async function exportLegacyLocalData(
  product: Product
): Promise<LegacyLocalDataBackup | undefined> {
  const summary = await detectLegacyLocalData(product);
  if (!summary.databases.length) return undefined;

  const databases: LegacyLocalDatabaseBackup[] = [];
  for (const item of summary.databases) {
    const database = await openExistingIndexedDatabase(item.name).catch(
      () => null
    );
    if (!database) continue;
    try {
      databases.push({
        name: item.name,
        version: database.version,
        provider: item.provider,
        stores: await readStoreBackups(
          database,
          Array.from(database.objectStoreNames)
        )
      });
    } finally {
      database.close();
    }
  }

  return {
    schema: "nucleum-legacy-local-data-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    product,
    databases
  };
}

/**
 * Returns the total number of legacy records visible in a detection summary.
 */
export function resolveLegacyLocalDataRecordCount(
  summary: LegacyLocalDataSummary | LegacyLocalDataBackup | undefined
) {
  return (
    summary?.databases.reduce(
      (databaseTotal, database) =>
        databaseTotal +
        database.stores.reduce(
          (storeTotal, store) =>
            storeTotal +
            ("count" in store ? store.count : store.records.length),
          0
        ),
      0
    ) ?? 0
  );
}

export function resolveLegacyImportableRecordCount(
  summary: LegacyLocalDataSummary | LegacyLocalDataBackup | undefined
) {
  return (
    summary?.databases.reduce(
      (databaseTotal, database) =>
        databaseTotal +
        database.stores.reduce((storeTotal, store) => {
          if (!isImportableLegacyStore(store.name) || store.error) {
            return storeTotal;
          }
          return (
            storeTotal + ("count" in store ? store.count : store.records.length)
          );
        }, 0),
      0
    ) ?? 0
  );
}

/**
 * Returns true when a legacy data summary contains records that can be offered for recovery.
 */
export function hasRecoverableLegacyLocalData(
  summary: LegacyLocalDataSummary | undefined
) {
  return resolveLegacyImportableRecordCount(summary) > 0;
}

/**
 * Reads the durable per-product decision that suppresses the startup recovery prompt.
 */
export async function getLegacyLocalDataRecoveryDecision(
  product: Product,
  source?: LegacyLocalDataSummary | LegacyLocalDataBackup
) {
  const decisions = await readLegacyLocalDataRecoveryDecisions();
  const key = await resolveLegacyLocalDataRecoveryDecisionKey(product, source);
  return decisions[key];
}

/**
 * Persists a per-product decision after a legacy import or explicit backup download succeeds.
 */
export async function saveLegacyLocalDataRecoveryDecision(
  decision: Omit<
    LegacyLocalDataRecoveryDecision,
    "identity" | "sourceDatabases"
  >,
  source?: LegacyLocalDataSummary | LegacyLocalDataBackup
) {
  const decisions = await readLegacyLocalDataRecoveryDecisions();
  const identity = await resolveActiveLegacyLocalDataIdentity();
  const sourceDatabases = resolveLegacySourceDatabaseNames(source);
  const key = resolveLegacyLocalDataRecoveryDecisionKeyFromParts(
    decision.product,
    identity,
    sourceDatabases
  );
  decisions[key] = {
    ...decision,
    identity: resolveLegacyIdentityScope(identity),
    sourceDatabases
  };
  await clientStorage.set(
    ClientStorageKey.LEGACY_LOCAL_DATA_RECOVERY,
    decisions
  );
}

/**
 * Converts a raw legacy local backup into the structured DataFn import payload.
 */
export function convertLegacyLocalDataBackupToDatafnImport(
  backup: LegacyLocalDataBackup
): LegacyDatafnImportPayload {
  const resources = new Map<string, Map<string, Record<string, unknown>>>();
  const joins = new Map<string, Map<string, Record<string, unknown>>>();
  const kv: Record<string, unknown> = {};
  const knownResourceById = collectKnownLegacyResources(backup);

  for (const database of backup.databases) {
    for (const store of database.stores) {
      if (store.error) {
        throw new Error(
          `Unable to import legacy store ${store.name}: ${store.error}`
        );
      }
      if (store.name === "kv") {
        addLegacyKvRecords(kv, store.records);
        continue;
      }
      if (store.name === "link" || store.name === "nodelinks") {
        for (const item of store.records) {
          const record = normalizeLegacyRecord(item.value);
          if (record) {
            addLegacyLinkJoinRows(joins, record, knownResourceById);
          }
        }
        continue;
      }

      const targetResource = resolveLegacyStoreResource(store.name);
      if (!targetResource) continue;
      for (const item of store.records) {
        const record = normalizeLegacyRecord(item.value);
        if (!record) continue;
        const id = resolveRecordId(record.id, item.key);
        if (!id) continue;
        record.id = id;
        const converted = convertLegacyResourceRecord(
          targetResource,
          record,
          store.name
        );
        if (converted) {
          addResourceRecord(resources, targetResource, converted);
        }
        addLegacyEmbeddedJoinRows(joins, targetResource, record, id);
      }
    }
  }

  const resourceRows = Array.from(resources.values()).reduce(
    (total, records) => total + records.size,
    0
  );
  const joinRows = Array.from(joins.values()).reduce(
    (total, records) => total + records.size,
    0
  );
  if (resourceRows + joinRows + Object.keys(kv).length === 0) {
    throw new Error("Legacy backup does not contain importable records");
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    schema: schemaResources.map((resource) => ({
      name: resource.name,
      version: resource.version
    })),
    resources: mapRecordCollectionsToObject(resources),
    joins: mapRecordCollectionsToObject(joins),
    kv
  };
}

function shouldIgnoreDatabase(name: string) {
  return (
    ignoredDatabaseNames.has(name) || name.startsWith(currentDatafnDbPrefix)
  );
}

function resolveLegacyLocalDataProvider(
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

function isImportableLegacyStore(storeName: string) {
  return (
    storeName === "kv" ||
    storeName === "link" ||
    storeName === "nodelinks" ||
    Boolean(resolveLegacyStoreResource(storeName))
  );
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

function resolveLegacyIndexedDbFallbackDescriptors(
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

async function listExistingIndexedDatabases() {
  if (typeof indexedDB === "undefined") return undefined;
  const indexedDb = indexedDB as IndexedDbWithDatabases;
  if (typeof indexedDb.databases !== "function") return undefined;
  return indexedDb.databases().catch(() => undefined);
}

function openExistingIndexedDatabase(name: string): Promise<IDBDatabase> {
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

async function readStoreSummaries(
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

async function readStoreBackups(
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

async function serializeIndexedDbValue(
  value: unknown,
  seen = new WeakSet<object>()
): Promise<unknown> {
  if (value === undefined) {
    return { [serializationTypeKey]: "Undefined" };
  }
  if (value === null || typeof value !== "object") {
    if (typeof value === "bigint") {
      return {
        [serializationTypeKey]: "BigInt",
        value: value.toString()
      };
    }
    return value;
  }
  if (seen.has(value)) {
    return { [serializationTypeKey]: "CircularReference" };
  }
  if (value instanceof Date) {
    return {
      [serializationTypeKey]: "Date",
      value: value.toISOString()
    };
  }
  if (typeof File !== "undefined" && value instanceof File) {
    return {
      [serializationTypeKey]: "File",
      name: value.name,
      lastModified: value.lastModified,
      type: value.type,
      size: value.size,
      dataBase64: arrayBufferToBase64(await value.arrayBuffer())
    };
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return {
      [serializationTypeKey]: "Blob",
      type: value.type,
      size: value.size,
      dataBase64: arrayBufferToBase64(await value.arrayBuffer())
    };
  }
  if (value instanceof ArrayBuffer) {
    return {
      [serializationTypeKey]: "ArrayBuffer",
      dataBase64: arrayBufferToBase64(value)
    };
  }
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    return {
      [serializationTypeKey]: value.constructor.name,
      dataBase64: bytesToBase64(bytes)
    };
  }

  seen.add(value);
  if (Array.isArray(value)) {
    const result = await Promise.all(
      value.map((item) => serializeIndexedDbValue(item, seen))
    );
    seen.delete(value);
    return result;
  }
  if (value instanceof Map) {
    const entries = await Promise.all(
      Array.from(value.entries()).map(async ([key, item]) => [
        await serializeIndexedDbValue(key, seen),
        await serializeIndexedDbValue(item, seen)
      ])
    );
    seen.delete(value);
    return {
      [serializationTypeKey]: "Map",
      entries
    };
  }
  if (value instanceof Set) {
    const values = await Promise.all(
      Array.from(value.values()).map((item) =>
        serializeIndexedDbValue(item, seen)
      )
    );
    seen.delete(value);
    return {
      [serializationTypeKey]: "Set",
      values
    };
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = await serializeIndexedDbValue(item, seen);
  }
  seen.delete(value);
  return result;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return bytesToBase64(new Uint8Array(buffer));
}

function bytesToBase64(bytes: Uint8Array) {
  const chunkSize = 32768;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function normalizeKeyPath(keyPath: string | string[] | null) {
  if (keyPath === null || typeof keyPath === "string") return keyPath;
  return Array.isArray(keyPath) ? [...keyPath] : String(keyPath);
}

function getJoinStoreKey(from: string, relation: string, to: string) {
  return `join_${from}_${relation}_${to}`;
}

async function readLegacyLocalDataRecoveryDecisions(): Promise<
  Record<string, LegacyLocalDataRecoveryDecision>
> {
  const value = await clientStorage.get(
    ClientStorageKey.LEGACY_LOCAL_DATA_RECOVERY
  );
  if (!value) return {};
  try {
    const parsed = typeof value === "string" ? parse(value) : value;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, LegacyLocalDataRecoveryDecision>)
      : {};
  } catch {
    return {};
  }
}

async function resolveActiveLegacyLocalDataIdentity(): Promise<LegacyLocalDataIdentity> {
  const [storedUserInfo, storedUser, dapId] = await Promise.all([
    clientStorage.get(ClientStorageKey.USER_INFO),
    clientStorage.get(ClientStorageKey.USER),
    clientStorage.get(ClientStorageKey.DAP_ID)
  ]);
  const userInfo = parseStoredPlainObject(storedUserInfo);
  const user = parseStoredPlainObject(storedUser);
  const userId = resolveRecordId(
    userInfo?.id,
    user?.actorId,
    isPlainObject(user?.subject) ? user.subject.id : undefined
  )?.replace(/^user:/, "");
  return {
    userId,
    dapId: typeof dapId === "string" ? dapId.trim() || undefined : undefined
  };
}

async function resolveLegacyLocalDataRecoveryDecisionKey(
  product: Product,
  source?: LegacyLocalDataSummary | LegacyLocalDataBackup
) {
  return resolveLegacyLocalDataRecoveryDecisionKeyFromParts(
    product,
    await resolveActiveLegacyLocalDataIdentity(),
    resolveLegacySourceDatabaseNames(source)
  );
}

function resolveLegacyLocalDataRecoveryDecisionKeyFromParts(
  product: Product,
  identity: LegacyLocalDataIdentity,
  sourceDatabases: string[]
) {
  return `${product}:${resolveLegacyIdentityScope(identity)}:${sourceDatabases.join("|")}`;
}

function resolveLegacyIdentityScope(identity: LegacyLocalDataIdentity) {
  if (identity.userId) return `user:${identity.userId}`;
  if (identity.dapId) return `guest:${identity.dapId}`;
  return "unknown";
}

function resolveLegacySourceDatabaseNames(
  source?: LegacyLocalDataSummary | LegacyLocalDataBackup
) {
  return (source?.databases.map((database) => database.name) ?? []).sort();
}

function collectKnownLegacyResources(backup: LegacyLocalDataBackup) {
  const result = new Map<string, string>();
  for (const database of backup.databases) {
    for (const store of database.stores) {
      const targetResource = resolveLegacyStoreResource(store.name);
      if (!targetResource) continue;
      for (const item of store.records) {
        const record = normalizeLegacyRecord(item.value);
        const id = resolveRecordId(record?.id, item.key);
        if (id) {
          result.set(id, targetResource);
        }
      }
    }
  }
  return result;
}

function resolveLegacyStoreResource(storeName: string) {
  const mapped = legacyResourceMap.get(storeName);
  return mapped && isSchemaResourceName(mapped) ? mapped : undefined;
}

function isSchemaResourceName(value: string): value is SchemaResourceName {
  return schemaResourceNames.has(value as SchemaResourceName);
}

function normalizeLegacyRecord(value: unknown) {
  const normalized = normalizeLegacyValue(value);
  return isPlainObject(normalized) ? normalized : undefined;
}

function normalizeLegacyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeLegacyValue(item))
      .filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return value;

  const marker = value[serializationTypeKey];
  if (typeof marker === "string") {
    return normalizeSerializedLegacyValue(marker, value);
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalizeLegacyValue(item);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }
  return result;
}

function normalizeSerializedLegacyValue(
  marker: string,
  value: Record<string, unknown>
) {
  if (marker === "Date") return value.value;
  if (marker === "BigInt") return value.value;
  if (marker === "Undefined" || marker === "CircularReference") {
    return undefined;
  }
  if (marker === "Map") return normalizeLegacyValue(value.entries);
  if (marker === "Set") return normalizeLegacyValue(value.values);
  if (
    marker === "ArrayBuffer" ||
    marker === "Uint8Array" ||
    marker === "Uint8ClampedArray" ||
    marker === "Int8Array" ||
    marker === "Uint16Array" ||
    marker === "Int16Array" ||
    marker === "Uint32Array" ||
    marker === "Int32Array" ||
    marker === "Float32Array" ||
    marker === "Float64Array" ||
    marker === "Blob" ||
    marker === "File"
  ) {
    return typeof value.dataBase64 === "string"
      ? base64ToBytes(value.dataBase64)
      : undefined;
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalizeLegacyValue(item);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }
  return result;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function addLegacyKvRecords(
  kv: Record<string, unknown>,
  records: LegacyLocalRecordBackup[]
) {
  for (const item of records) {
    const record = normalizeLegacyRecord(item.value);
    if (!record) continue;
    const id = resolveRecordId(record.id, item.key);
    if (!id) continue;
    const key = id.replace(/^kv:/, "");
    if (!key || key === "local") continue;
    const { id: _id, ...value } = record;
    kv[key] =
      Object.keys(value).length === 1 && "value" in value ? value.value : value;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseStoredPlainObject(value: string | null) {
  if (!value) return undefined;
  try {
    const parsed = parse(value) as unknown;
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function resolveRecordId(...values: unknown[]) {
  for (const value of values) {
    const id = normalizeRecordId(value);
    if (id) return id;
  }
  return undefined;
}

function normalizeRecordId(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (!isPlainObject(value)) return undefined;
  const table = value.tb ?? value.table ?? value.resource;
  const id = value.id ?? value.value;
  if (typeof table === "string" && id !== undefined && id !== null) {
    const normalizedId = normalizeRecordId(id);
    return normalizedId ? `${table}:${normalizedId}` : undefined;
  }
  return normalizeRecordId(id);
}

function convertLegacyResourceRecord(
  resource: SchemaResourceName,
  record: Record<string, unknown>,
  sourceStore: string
) {
  const transformed = transformLegacyRecord(resource, record, sourceStore);
  const allowedFields = schemaFieldsByResource.get(resource);
  if (!allowedFields) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(transformed)) {
    if (allowedFields.has(key) && value !== undefined) {
      result[key] = value;
    }
  }
  return typeof result.id === "string" ? result : undefined;
}

function transformLegacyRecord(
  resource: string,
  record: Record<string, unknown>,
  sourceStore: string
) {
  const result: Record<string, unknown> = { ...record };
  if (record.modifiedAt !== undefined && result.updatedAt === undefined) {
    result.updatedAt = record.modifiedAt;
  }
  if (record.modifiedBy !== undefined && result.updatedBy === undefined) {
    result.updatedBy = normalizeRecordId(record.modifiedBy);
  }
  if (record.createdBy !== undefined) {
    result.createdBy = normalizeRecordId(record.createdBy);
  }
  if (record.trashInformation && isPlainObject(record.trashInformation)) {
    const trashInformation = record.trashInformation;
    result.trashedAt = result.trashedAt ?? trashInformation.deletedAt;
    result.trashedBy =
      result.trashedBy ?? normalizeRecordId(trashInformation.deletedBy);
  }
  if (record.isParentInactive !== undefined) {
    result.isAncestorInactive = record.isParentInactive;
  }

  if (resource === "objective") {
    const parents = normalizeRecordIdArray(record.parent);
    if (parents.length > 0) {
      result.parentId = result.parentId ?? parents[parents.length - 1];
      result.parentPath = result.parentPath ?? parents.join("-");
    }
    result.subObjectivesLayout =
      result.subObjectivesLayout ?? record.subGoalsLayout;
  }

  if (resource === "task") {
    result.objectiveId =
      result.objectiveId ?? resolveRecordId(record.goalId, record.objectiveId);
    result.isChecked = result.isChecked ?? record.checked;
  }

  if (resource === "sessionLog") {
    result.objectiveId =
      result.objectiveId ?? resolveRecordId(record.goalId, record.objectiveId);
    if (sourceStore === "PointLog") {
      transformLegacyPointLog(result, record);
    }
  }

  if (resource === "collection" && typeof result.resource === "string") {
    result.resource =
      resolveLegacyResourceName(result.resource) ?? result.resource;
  }

  return result;
}

function transformLegacyPointLog(
  result: Record<string, unknown>,
  record: Record<string, unknown>
) {
  const logId = resolveLegacyTargetId(record.id, "sessionLog");
  const startUnix = resolveLegacyTimestamp(record.startUnix ?? record.start);
  const focus = resolveFiniteNumber(record.focus ?? record.totalFocus) ?? 0;
  const breakTime =
    resolveFiniteNumber(record.breakTime ?? record.totalBreak) ?? 0;
  const explicitEndUnix = resolveLegacyTimestamp(record.endUnix ?? record.end);
  const endUnix =
    explicitEndUnix ??
    (startUnix === undefined
      ? undefined
      : startUnix + Math.max(0, focus + breakTime) * 1000);
  const sessionId =
    resolveLegacyTargetId(record.sessionId, "session") ??
    (logId ? resolveLegacyTargetId(logId, "session") : undefined);
  result.id = logId;
  result.startUnix = startUnix;
  result.endUnix = endUnix;
  result.sessionId = sessionId;
  result.focus = focus;
  result.breakTime = breakTime;
  result.objectiveId = resolveLegacyTargetId(
    record.objectiveId ?? record.goalId,
    "objective"
  );
  result.taskId = resolveLegacyTargetId(record.taskId, "task");
  result.start =
    typeof record.start === "string"
      ? record.start
      : startUnix === undefined
        ? undefined
        : new Date(startUnix).toISOString();
  result.end =
    typeof record.end === "string"
      ? record.end
      : endUnix === undefined
        ? undefined
        : new Date(endUnix).toISOString();
}

function resolveLegacyTargetId(value: unknown, resource: string) {
  const id = normalizeRecordId(value);
  if (!id) return undefined;
  const separator = id.indexOf(":");
  const suffix = separator >= 0 ? id.slice(separator + 1) : id;
  return suffix ? `${resource}:${suffix}` : undefined;
}

function resolveLegacyTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 100_000_000_000 ? value * 1000 : value;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric < 100_000_000_000 ? numeric * 1000 : numeric;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function resolveFiniteNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function resolveLegacyResourceName(value: unknown) {
  if (typeof value !== "string") return undefined;
  return legacyResourceMap.get(value) ?? value;
}

function normalizeRecordIdArray(value: unknown): string[] {
  if (!value || value === 0) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeRecordId(item))
      .filter((item): item is string => Boolean(item));
  }
  const id = normalizeRecordId(value);
  return id ? [id] : [];
}

function resolveResourceForId(
  id: string,
  knownResourceById: Map<string, string>
) {
  const known = knownResourceById.get(id);
  if (known) return known;
  const prefix = id.includes(":") ? id.split(":")[0] : undefined;
  if (!prefix) return undefined;
  return resolveLegacyResourceName(prefix);
}

function addResourceRecord(
  resources: Map<string, Map<string, Record<string, unknown>>>,
  resource: string,
  record: Record<string, unknown>
) {
  const id = typeof record.id === "string" ? record.id : undefined;
  if (!id) return;
  let resourceRecords = resources.get(resource);
  if (!resourceRecords) {
    resourceRecords = new Map();
    resources.set(resource, resourceRecords);
  }
  resourceRecords.set(id, {
    ...(resourceRecords.get(id) ?? {}),
    ...record
  });
}

function addJoinRecord(
  joins: Map<string, Map<string, Record<string, unknown>>>,
  storeName: string,
  row: Record<string, unknown>
) {
  if (typeof row.from !== "string" || typeof row.to !== "string") return;
  let joinRecords = joins.get(storeName);
  if (!joinRecords) {
    joinRecords = new Map();
    joins.set(storeName, joinRecords);
  }
  const key = `${row.from}:${row.to}`;
  joinRecords.set(key, {
    ...(joinRecords.get(key) ?? {}),
    ...row
  });
}

function addLegacyLinkJoinRows(
  joins: Map<string, Map<string, Record<string, unknown>>>,
  record: Record<string, unknown>,
  knownResourceById: Map<string, string>
) {
  const from = resolveRecordId(record.in, record.from, record.source);
  const to = resolveRecordId(record.out, record.to, record.target);
  if (!from || !to) return;
  const fromResource = resolveResourceForId(from, knownResourceById);
  const toResource = resolveResourceForId(to, knownResourceById);
  if (!fromResource || !toResource) return;
  const metadata = pickJoinMetadata(record);
  if (
    toResource === "collection" &&
    collectionItemResources.has(fromResource)
  ) {
    addJoinRecord(
      joins,
      getJoinStoreKey(fromResource, "collections", "collection"),
      {
        from,
        to,
        fromResource,
        toResource,
        ...metadata
      }
    );
    return;
  }
  if (
    recordLinkResources.has(fromResource) &&
    recordLinkResources.has(toResource)
  ) {
    addJoinRecord(joins, getJoinStoreKey(fromResource, "links", toResource), {
      from,
      to,
      fromResource,
      toResource,
      ...metadata
    });
  }
}

function addLegacyEmbeddedJoinRows(
  joins: Map<string, Map<string, Record<string, unknown>>>,
  resource: string,
  record: Record<string, unknown>,
  id: string
) {
  addLegacyCollectionJoinRows(joins, resource, record, id);
  addLegacyPropertyJoinRows(joins, resource, record, id);
  addLegacyCollectionConfigJoinRows(joins, resource, record, id);
  addLegacySessionItemJoinRows(joins, resource, record, id);
}

function addLegacyCollectionJoinRows(
  joins: Map<string, Map<string, Record<string, unknown>>>,
  resource: string,
  record: Record<string, unknown>,
  id: string
) {
  if (!collectionItemResources.has(resource)) return;
  for (const item of normalizeRelationItems(record.collections)) {
    const collectionId = item.ref;
    if (!collectionId) continue;
    addJoinRecord(
      joins,
      getJoinStoreKey(resource, "collections", "collection"),
      {
        from: id,
        to: collectionId,
        fromResource: resource,
        toResource: "collection",
        ...pickJoinMetadata(item.metadata)
      }
    );
  }
}

function addLegacyPropertyJoinRows(
  joins: Map<string, Map<string, Record<string, unknown>>>,
  resource: string,
  record: Record<string, unknown>,
  id: string
) {
  if (!propertyValueResources.has(resource)) return;
  const values = record.propertyValues ?? record.properties;
  for (const item of normalizeRelationItems(values)) {
    const propertyId = item.ref;
    if (!propertyId) continue;
    addJoinRecord(
      joins,
      getJoinStoreKey(resource, "propertyValues", "property"),
      {
        from: id,
        to: propertyId,
        fromResource: resource,
        toResource: "property",
        collectionId: item.metadata.collectionId,
        value: item.metadata.value,
        ...pickJoinMetadata(item.metadata)
      }
    );
  }
}

function addLegacyCollectionConfigJoinRows(
  joins: Map<string, Map<string, Record<string, unknown>>>,
  resource: string,
  record: Record<string, unknown>,
  id: string
) {
  if (resource !== "collection") return;
  normalizeRelationItems(record.properties).forEach((item, sortOrder) => {
    if (!item.ref) return;
    addJoinRecord(
      joins,
      getJoinStoreKey("collection", "properties", "property"),
      {
        from: id,
        to: item.ref,
        fromResource: "collection",
        toResource: "property",
        sortOrder,
        ...pickJoinMetadata(item.metadata)
      }
    );
  });
  normalizeRelationItems(record.views).forEach((item, sortOrder) => {
    if (!item.ref) return;
    addJoinRecord(joins, getJoinStoreKey("collection", "views", "view"), {
      from: id,
      to: item.ref,
      fromResource: "collection",
      toResource: "view",
      sortOrder,
      ...pickJoinMetadata(item.metadata)
    });
  });
}

function addLegacySessionItemJoinRows(
  joins: Map<string, Map<string, Record<string, unknown>>>,
  resource: string,
  record: Record<string, unknown>,
  id: string
) {
  if (resource !== "session") return;
  normalizeRelationItems(record.items).forEach((item, sortOrder) => {
    if (!item.ref) return;
    const toResource = resolveLegacyResourceName(item.ref.split(":")[0]);
    if (!toResource || !sessionItemResources.has(toResource)) return;
    addJoinRecord(joins, getJoinStoreKey("session", "items", toResource), {
      from: id,
      to: item.ref,
      fromResource: "session",
      toResource,
      sortOrder,
      ...pickJoinMetadata(item.metadata)
    });
  });
}

function normalizeRelationItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (isPlainObject(item)) {
      const ref = resolveRecordId(item.$ref, item.id, item.ref, item.value);
      const metadata: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item)) {
        if (!["$ref", "id", "ref"].includes(key)) {
          metadata[key] = value;
        }
      }
      return { ref, metadata };
    }
    return { ref: resolveRecordId(item), metadata: {} };
  });
}

function pickJoinMetadata(record: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of [
    "linkType",
    "location",
    "tags",
    "sortOrder",
    "parentObjectiveId",
    "blocks",
    "collectionId",
    "value",
    ...joinCapabilityFields
  ]) {
    const value = record[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function mapRecordCollectionsToObject(
  collections: Map<string, Map<string, Record<string, unknown>>>
) {
  const result: Record<string, Array<Record<string, unknown>>> = {};
  for (const [key, values] of collections.entries()) {
    const records = Array.from(values.values());
    if (records.length) {
      result[key] = records;
    }
  }
  return result;
}
