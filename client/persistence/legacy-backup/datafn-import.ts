import type { LegacyLocalDataBackup, LegacyDatafnImportPayload } from "./types";
import { TIMEZONE_CHANGE_RESOURCE_NAME } from "@datafn/client";
import {
  isImportableLegacyStore,
  collectKnownLegacyResources,
  addLegacyKvRecords,
  normalizeLegacyRecord,
  addLegacyLinkJoinRows,
  convertLegacyTimezoneChangeRecord,
  addResourceRecord,
  resolveLegacyStoreResource,
  resolveRecordId,
  convertLegacyResourceRecord,
  resolveLegacyTargetId,
  addLegacyPointLogSession,
  addLegacyEmbeddedJoinRows,
  schemaResources,
  mapRecordCollectionsToObject,
  normalizeLegacyDatafnResourceIds,
  addJoinRecord,
  normalizeLegacyDatafnJoinIds
} from "./record-conversion";

/** Converts a legacy backup into DataFn resource, join, and KV rows. */
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
      if (store.name === "tz") {
        for (const item of store.records) {
          const record = normalizeLegacyRecord(item.value);
          const converted = record
            ? convertLegacyTimezoneChangeRecord(record, item.key)
            : undefined;
          if (converted) {
            addResourceRecord(
              resources,
              TIMEZONE_CHANGE_RESOURCE_NAME,
              converted
            );
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
          if (
            store.name === "PointLog" &&
            !resolveLegacyTargetId(record.sessionId, "session")
          ) {
            addLegacyPointLogSession(resources, converted);
          }
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
    schema: [
      ...schemaResources.map((resource) => ({
        name: resource.name,
        version: resource.version
      })),
      ...(resources.has(TIMEZONE_CHANGE_RESOURCE_NAME)
        ? [{ name: TIMEZONE_CHANGE_RESOURCE_NAME, version: 1 }]
        : [])
    ],
    resources: mapRecordCollectionsToObject(resources),
    joins: mapRecordCollectionsToObject(joins),
    kv
  };
}

/** Normalizes imported resource and join identifiers. */
export function normalizeLegacyDatafnImportIds(
  payload: LegacyDatafnImportPayload
): LegacyDatafnImportPayload {
  const normalizedResources = new Map<
    string,
    Map<string, Record<string, unknown>>
  >();
  Object.entries(payload.resources).forEach(([resource, records]) => {
    records.forEach((record) => {
      addResourceRecord(
        normalizedResources,
        resource,
        normalizeLegacyDatafnResourceIds(resource, record)
      );
    });
  });
  const normalizedJoins = new Map<
    string,
    Map<string, Record<string, unknown>>
  >();
  Object.entries(payload.joins ?? {}).forEach(([storeName, records]) => {
    records.forEach((record) => {
      addJoinRecord(
        normalizedJoins,
        storeName,
        normalizeLegacyDatafnJoinIds(record)
      );
    });
  });
  return {
    ...payload,
    resources: mapRecordCollectionsToObject(normalizedResources),
    joins: mapRecordCollectionsToObject(normalizedJoins)
  };
}
