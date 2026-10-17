import type { LegacyLocalDataSummary, LegacyLocalDataBackup } from "./types";
import { isImportableLegacyStore } from "./record-conversion";

/** Counts all records in a legacy summary or backup. */
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

/** Counts records from stores supported by the migration. */
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

/** Reports whether discovered legacy data can be imported. */
export function hasRecoverableLegacyLocalData(
  summary: LegacyLocalDataSummary | undefined
) {
  return resolveLegacyImportableRecordCount(summary) > 0;
}
