import {
  datafn,
  refreshNucleumDatafnStatus,
  type NucleumDatafnRuntime
} from "@nucleum/datafn/datafn.store";
import type { DatafnImportResult } from "@nucleum/datafn/datafn.type";
import {
  convertLegacyLocalDataBackupToDatafnImport,
  normalizeLegacyDatafnImportIds
} from "@nucleum/persistence/legacy-backup/datafn-import";
import type { LegacyLocalDataBackup } from "@nucleum/persistence/legacy-backup/types";

/** Imports a normalized legacy backup and rejects partial imports. */
export async function importLegacyLocalDataBackup(
  runtime: NucleumDatafnRuntime,
  backup: LegacyLocalDataBackup
) {
  if (!runtime.storage) {
    throw new Error("Local DataFn storage is required for legacy import");
  }
  const { kv = {}, ...payload } = normalizeLegacyDatafnImportIds(
    convertLegacyLocalDataBackupToDatafnImport(backup)
  );
  const hasStructuredRows =
    Object.values(payload.resources).some((records) => records.length > 0) ||
    Object.values(payload.joins ?? {}).some((records) => records.length > 0);
  let result: DatafnImportResult = { ok: true };
  if (hasStructuredRows) {
    result = (await datafn.importData(payload, {
      triggerCloneUp: runtime.mode === "sync"
    })) as DatafnImportResult;
    const skipped =
      countDatafnImportRows(result.stats?.resources, "skipped") +
      countDatafnImportRows(result.stats?.joins, "skipped");
    if (!result?.ok || skipped > 0) {
      throw new Error(
        result?.errors?.[0]?.message ??
          (skipped > 0
            ? "DataFn legacy import skipped records"
            : "DataFn legacy import failed")
      );
    }
  }
  for (const [key, value] of Object.entries(kv)) {
    const kvResult = await datafn.kv.set(key, value);
    if (!kvResult.ok) throw kvResult.error;
  }
  await refreshNucleumDatafnStatus();
  return {
    resources:
      countDatafnImportRows(result.stats?.resources, "imported") +
      Object.keys(kv).length,
    joins: countDatafnImportRows(result.stats?.joins, "imported")
  };
}

function countDatafnImportRows(
  stats: Record<string, { imported?: number; skipped?: number }> | undefined,
  field: "imported" | "skipped"
) {
  return (
    Object.values(stats ?? {}).reduce(
      (total, item) => total + (item[field] ?? 0),
      0
    ) ?? 0
  );
}
