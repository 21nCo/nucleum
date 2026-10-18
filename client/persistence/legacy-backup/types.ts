import type { Product } from "@nucleum/schema/product.type";

/** Storage engine detected for a legacy local database. */
export type LegacyLocalDataProvider = "dexie" | "indexeddb" | "surreal";

/** Record count and read status for one legacy store. */
export type LegacyLocalStoreSummary = {
  name: string;
  count: number;
  error?: string;
};

/** Discovery result for one legacy database. */
export type LegacyLocalDatabaseSummary = {
  name: string;
  version: number;
  provider: LegacyLocalDataProvider;
  stores: LegacyLocalStoreSummary[];
};

/** Discovery result for all legacy databases on this device. */
export type LegacyLocalDataSummary = {
  isSupported: boolean;
  databases: LegacyLocalDatabaseSummary[];
};

/** Portable snapshot of legacy local data. */
export type LegacyLocalDataBackup = {
  schema: "nucleum-legacy-local-data-backup";
  version: 1;
  exportedAt: string;
  product: string;
  databases: LegacyLocalDatabaseBackup[];
};

/** Exported stores from one legacy database. */
export type LegacyLocalDatabaseBackup = {
  name: string;
  version: number;
  provider: LegacyLocalDataProvider;
  stores: LegacyLocalStoreBackup[];
};

/** Exported records and index metadata from one store. */
export type LegacyLocalStoreBackup = {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: LegacyLocalIndexBackup[];
  records: LegacyLocalRecordBackup[];
  error?: string;
};

/** Legacy IndexedDB index metadata. */
export type LegacyLocalIndexBackup = {
  name: string;
  keyPath: string | string[] | null;
  multiEntry: boolean;
  unique: boolean;
};

/** A legacy record with its original key. */
export type LegacyLocalRecordBackup = {
  key: unknown;
  value: unknown;
};

/** User choice for handling a discovered legacy backup. */
export type LegacyLocalDataRecoveryAction =
  | "import_old_data"
  | "download_backup_continue";

/** Persisted recovery decision for a product and identity. */
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
  isCloudUploadPending?: boolean;
};

/** Normalized records prepared for DataFn import. */
export type LegacyDatafnImportPayload = {
  version: 1;
  exportedAt: string;
  schema: Array<{ name: string; version: number }>;
  resources: Record<string, Array<Record<string, unknown>>>;
  joins?: Record<string, Array<Record<string, unknown>>>;
  kv?: Record<string, unknown>;
};

/** Identity used to select legacy local databases. */
export type LegacyLocalDataIdentity = {
  userId?: string;
  dapId?: string;
};
