import { Product } from "@21n/products/product.type";
import { resolveDatafnProductResources } from "@21n/stores/datafn.store";
import {
  convertLegacyLocalDataBackupToDatafnImport,
  normalizeLegacyDatafnImportIds,
  type LegacyLocalDataBackup,
  type LegacyLocalStoreBackup
} from "@21n/persistence/legacyLocalDataBackup";

type DatafnBackupRecord = Record<string, unknown>;

export const pointronDatafnBackupResources = resolveDatafnProductResources(
  Product.POINTRON
);

const pointronDatafnBackupResourceNames = new Set<string>(
  pointronDatafnBackupResources
);

function isObjectRecord(value: unknown): value is DatafnBackupRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyArrayValues(value: DatafnBackupRecord) {
  return Object.values(value).every((entry) => Array.isArray(entry));
}

function isCurrentPointronDatafnBackup(value: unknown) {
  if (!isObjectRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!isObjectRecord(value.resources)) return false;
  if (!hasOnlyArrayValues(value.resources)) return false;
  return Object.keys(value.resources).some((resource) =>
    pointronDatafnBackupResourceNames.has(resource)
  );
}

function isLegacyPointronBackup(value: unknown) {
  if (!isObjectRecord(value)) return false;
  const requiredCollections = ["goals", "tags", "logs", "sessions"];
  return (
    requiredCollections.every((key) => Array.isArray(value[key])) &&
    requiredCollections.some(
      (key) => Array.isArray(value[key]) && value[key].length > 0
    )
  );
}

function createLegacyStore(
  name: string,
  records: unknown[]
): LegacyLocalStoreBackup {
  return {
    name,
    keyPath: "id",
    autoIncrement: false,
    indexes: [],
    records: records.map((value, index) => ({
      key: isObjectRecord(value) && value.id !== undefined ? value.id : index,
      value
    }))
  };
}

function convertLegacyPointronBackup(value: DatafnBackupRecord) {
  const stores = [
    createLegacyStore("PointGoal", value.goals as unknown[]),
    createLegacyStore("PointTag", value.tags as unknown[]),
    createLegacyStore("PointLog", value.logs as unknown[]),
    createLegacyStore("PointSession", value.sessions as unknown[])
  ];
  const backup: LegacyLocalDataBackup = {
    schema: "nucleum-legacy-local-data-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    product: Product.POINTRON,
    databases: [
      {
        name: "pointron-legacy-export",
        version: 1,
        provider: "surreal",
        stores
      }
    ]
  };
  return normalizeLegacyDatafnImportIds(
    convertLegacyLocalDataBackupToDatafnImport(backup)
  );
}

/**
 * Resolves current and legacy Pointron exports to a DataFn import payload.
 */
export function resolvePointronDatafnBackup(value: unknown) {
  if (isCurrentPointronDatafnBackup(value)) return value;
  if (!isLegacyPointronBackup(value) || !isObjectRecord(value)) {
    return undefined;
  }
  try {
    return convertLegacyPointronBackup(value);
  } catch {
    return undefined;
  }
}

export function isPointronDatafnBackup(value: unknown) {
  return resolvePointronDatafnBackup(value) !== undefined;
}

export function resolveDatafnImportErrorCount(value: unknown) {
  if (!isObjectRecord(value)) return 0;
  return Array.isArray(value.errors) ? value.errors.length : 0;
}
