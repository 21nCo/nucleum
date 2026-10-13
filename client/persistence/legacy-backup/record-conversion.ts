import { nucleumDatafnSchema } from "@nucleum/schema/datafn";
import {
  TIMEZONE_CHANGE_RESOURCE_NAME,
  timezoneChangeId
} from "@datafn/client";

import {
  type LegacyLocalDataBackup,
  type LegacyLocalRecordBackup
} from "./types";
import {
  normalizeLegacyValue,
  isPlainObject
} from "@nucleum/persistence/legacy-backup/serialized-value";

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

export const schemaResources = nucleumDatafnSchema.resources.filter(
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

export function isImportableLegacyStore(storeName: string) {
  return (
    storeName === "kv" ||
    storeName === "tz" ||
    storeName === "link" ||
    storeName === "nodelinks" ||
    Boolean(resolveLegacyStoreResource(storeName))
  );
}

function getJoinStoreKey(from: string, relation: string, to: string) {
  return `join_${from}_${relation}_${to}`;
}

export function collectKnownLegacyResources(backup: LegacyLocalDataBackup) {
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

export function resolveLegacyStoreResource(storeName: string) {
  const mapped = legacyResourceMap.get(storeName);
  return mapped && isSchemaResourceName(mapped) ? mapped : undefined;
}

function isSchemaResourceName(value: string): value is SchemaResourceName {
  return schemaResourceNames.has(value as SchemaResourceName);
}

export function normalizeLegacyRecord(value: unknown) {
  const normalized = normalizeLegacyValue(value);
  return isPlainObject(normalized) ? normalized : undefined;
}

export function addLegacyKvRecords(
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

export function resolveRecordId(...values: unknown[]) {
  for (const value of values) {
    const id = normalizeRecordId(value);
    if (id) return id;
  }
  return undefined;
}

export function normalizeRecordId(value: unknown): string | undefined {
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

export function convertLegacyResourceRecord(
  resource: SchemaResourceName,
  record: Record<string, unknown>,
  sourceStore: string
) {
  const transformed = transformLegacyRecord(resource, record, sourceStore);
  if (!transformed) return undefined;
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

export function convertLegacyTimezoneChangeRecord(
  record: Record<string, unknown>,
  key: unknown
) {
  const timezone = resolveLegacyTimezone(record);
  const effectiveFrom = resolveLegacyTimestamp(
    record.effectiveFrom ?? record.dateUnix ?? record.date
  );
  if (!timezone || effectiveFrom === undefined) return undefined;
  const recordedAt =
    resolveLegacyTimestamp(
      record.recordedAt ?? record.updatedAt ?? record.createdAt
    ) ?? effectiveFrom;
  const sourceId = resolveRecordId(record.id, key) ?? "legacy";
  return {
    id: timezoneChangeId(effectiveFrom, timezone, sourceId),
    timezone,
    effectiveFrom,
    recordedAt,
    source: typeof record.source === "string" ? record.source : "import"
  };
}

function resolveLegacyTimezone(record: Record<string, unknown>) {
  const values = [record.timezone, record.zone, record.label];
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const marker = value.indexOf(" (UTC");
    const timezone = (marker >= 0 ? value.slice(0, marker) : value).trim();
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: timezone }).format();
      return timezone;
    } catch {
      continue;
    }
  }
  return undefined;
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
    if (sourceStore === "PointGoal") {
      result.type = result.type ?? "INDEFINITE";
      result.status =
        result.status ??
        (record.isCompleted === true ? "COMPLETED" : "NOT_STARTED");
    }
  }

  if (
    resource === "node" &&
    !Array.isArray(result.mdChildOrder) &&
    Array.isArray(record.children)
  ) {
    result.mdChildOrder = record.children;
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
      if (!transformLegacyPointLog(result, record)) return undefined;
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
  if (!logId || startUnix === undefined || endUnix === undefined) return false;
  const sessionId =
    resolveLegacyTargetId(record.sessionId, "session") ??
    `session:legacy-${logId.slice("sessionLog:".length)}`;
  result.id = logId;
  result.startUnix = startUnix;
  result.endUnix = endUnix;
  result.sessionId = sessionId;
  result.focus = focus;
  result.breakTime = breakTime;
  const objectiveId = resolveLegacyTargetId(
    record.objectiveId ?? record.goalId,
    "objective"
  );
  result.objectiveId =
    objectiveId === "objective:Empty" ? undefined : objectiveId;
  result.taskId = resolveLegacyTargetId(record.taskId, "task");
  result.start =
    typeof record.start === "string"
      ? record.start
      : new Date(startUnix).toISOString();
  result.end =
    typeof record.end === "string"
      ? record.end
      : new Date(endUnix).toISOString();
  return true;
}

export function addLegacyPointLogSession(
  resources: Map<string, Map<string, Record<string, unknown>>>,
  sessionLog: Record<string, unknown>
) {
  if (
    typeof sessionLog.sessionId !== "string" ||
    typeof sessionLog.startUnix !== "number" ||
    typeof sessionLog.endUnix !== "number"
  ) {
    return;
  }
  addResourceRecord(resources, "session", {
    id: sessionLog.sessionId,
    type: "MANUAL_ENTRY",
    blocks: [],
    elapsed: typeof sessionLog.focus === "number" ? sessionLog.focus : 0,
    extended: 0,
    start: sessionLog.start,
    startUnix: sessionLog.startUnix,
    end: sessionLog.end,
    endUnix: sessionLog.endUnix,
    manualEntryId: sessionLog.id
  });
}

export function normalizeLegacyDatafnResourceIds(
  resource: string,
  record: Record<string, unknown>
) {
  const result = { ...record };
  if (resource === TIMEZONE_CHANGE_RESOURCE_NAME) {
    return Object.fromEntries(
      Object.entries(result).filter(([, value]) => value !== undefined)
    );
  }
  result.id = resolveLegacyTargetId(record.id, resource);
  if (resource === "objective") {
    result.parentId = resolveLegacyTargetId(record.parentId, "objective");
    if (typeof record.parentPath === "string") {
      result.parentPath = normalizeLegacyObjectivePath(record.parentPath);
    }
  } else if (resource === "task") {
    result.objectiveId = resolveLegacyTargetId(record.objectiveId, "objective");
  } else if (resource === "sessionLog") {
    result.sessionId = resolveLegacyTargetId(record.sessionId, "session");
    result.objectiveId = resolveLegacyTargetId(record.objectiveId, "objective");
    result.taskId = resolveLegacyTargetId(record.taskId, "task");
  }
  return Object.fromEntries(
    Object.entries(result).filter(([, value]) => value !== undefined)
  );
}

export function normalizeLegacyDatafnJoinIds(record: Record<string, unknown>) {
  const fromResource = resolveLegacyResourceName(record.fromResource);
  const toResource = resolveLegacyResourceName(record.toResource);
  const result: Record<string, unknown> = {
    ...record,
    from:
      typeof fromResource === "string"
        ? resolveLegacyTargetId(record.from, fromResource)
        : record.from,
    to:
      typeof toResource === "string"
        ? resolveLegacyTargetId(record.to, toResource)
        : record.to,
    fromResource,
    toResource
  };
  if (record.collectionId !== undefined) {
    result.collectionId = resolveLegacyTargetId(
      record.collectionId,
      "collection"
    );
  }
  if (record.parentObjectiveId !== undefined) {
    result.parentObjectiveId = resolveLegacyTargetId(
      record.parentObjectiveId,
      "objective"
    );
  }
  return Object.fromEntries(
    Object.entries(result).filter(([, value]) => value !== undefined)
  );
}

function normalizeLegacyObjectivePath(value: string) {
  return value
    .replaceAll("PointGoal:", "objective:")
    .replaceAll("goal:", "objective:");
}

export function resolveLegacyTargetId(value: unknown, resource: string) {
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

export function addResourceRecord(
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

export function addJoinRecord(
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

export function addLegacyLinkJoinRows(
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

export function addLegacyEmbeddedJoinRows(
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

export function mapRecordCollectionsToObject(
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
