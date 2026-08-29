import { defineSchema } from "@datafn/core";
import type { CapabilityEntry } from "@datafn/core";

const shareable: CapabilityEntry = {
  shareable: {
    levels: ["viewer", "editor", "owner"],
    default: "private",
    visibilityDefault: "private",
    supportsScopeGrants: true,
    crossNsShareable: true,
    principalMode: "opaque-id"
  }
};

const shareableCapabilities: CapabilityEntry[] = [
  "timestamps",
  "audit",
  "trash",
  "archivable",
  shareable
] as CapabilityEntry[];

const systemCapabilities: CapabilityEntry[] = ["timestamps", "audit"];

const idField = { name: "id", type: "string", required: true, unique: true } as const;
const labelField = { name: "label", type: "string", required: false, nullable: false } as const;

const jsonField = <
  const Name extends string,
  const Required extends boolean = false,
  const Nullable extends boolean = false
>(
  name: Name,
  required?: Required,
  nullable?: Nullable
) =>
  ({
    name,
    type: "json",
    required: (required ?? false) as Required,
    nullable: (nullable ?? false) as Nullable
  }) as const;

const objectField = <
  const Name extends string,
  const Required extends boolean = false,
  const Nullable extends boolean = false
>(
  name: Name,
  required?: Required,
  nullable?: Nullable
) =>
  ({
    name,
    type: "object",
    required: (required ?? false) as Required,
    nullable: (nullable ?? false) as Nullable
  }) as const;

const arrayField = <
  const Name extends string,
  const Required extends boolean = false,
  const Nullable extends boolean = false
>(
  name: Name,
  required?: Required,
  defaultValue?: unknown[],
  nullable?: Nullable
) =>
  ({
    name,
    type: "array",
    required: (required ?? false) as Required,
    nullable: (nullable ?? false) as Nullable,
    ...(defaultValue === undefined ? {} : { default: defaultValue })
  }) as const;

const stringField = <
  const Name extends string,
  const Required extends boolean = false,
  const Nullable extends boolean = false
>(
  name: Name,
  required?: Required,
  nullable?: Nullable,
  defaultValue?: string
) =>
  ({
    name,
    type: "string",
    required: (required ?? false) as Required,
    nullable: (nullable ?? false) as Nullable,
    ...(defaultValue === undefined ? {} : { default: defaultValue })
  }) as const;

const numberField = <
  const Name extends string,
  const Required extends boolean = false,
  const Nullable extends boolean = false
>(
  name: Name,
  required?: Required,
  nullable?: Nullable,
  defaultValue?: number
) =>
  ({
    name,
    type: "number",
    required: (required ?? false) as Required,
    nullable: (nullable ?? false) as Nullable,
    ...(defaultValue === undefined ? {} : { default: defaultValue })
  }) as const;

const booleanField = <
  const Name extends string,
  const Required extends boolean = false,
  const Nullable extends boolean = false
>(
  name: Name,
  required?: Required,
  defaultValue?: boolean,
  nullable?: Nullable
) =>
  ({
    name,
    type: "boolean",
    required: (required ?? false) as Required,
    nullable: (nullable ?? false) as Nullable,
    ...(defaultValue === undefined ? {} : { default: defaultValue })
  }) as const;

const dateField = <
  const Name extends string,
  const Required extends boolean = false,
  const Nullable extends boolean = false
>(
  name: Name,
  required?: Required,
  nullable?: Nullable
) =>
  ({
    name,
    type: "date",
    required: (required ?? false) as Required,
    nullable: (nullable ?? false) as Nullable
  }) as const;

const commonShareFields = [
  booleanField("isStarred", false, false),
  booleanField("isLocked", false, false),
  booleanField("isAncestorInactive", false, false),
  stringField("importId")
] as const;

export const nucleumDatafnSchema = defineSchema({
  version: 1,
  namespaced: true,
  relationIntegrity: "database",
  defaultPermissions: {
    read: "allResourceFields",
    write: "allResourceFields",
    relationWrites: "all"
  },
  resources: [
    {
      name: "accessLog",
      version: 1,
      idPrefix: "accessLog",
      isRemoteOnly: true,
      capabilities: systemCapabilities,
      fields: [
        idField,
        stringField("resourceId"),
        stringField("resource"),
        stringField("action"),
        dateField("timestamp"),
        stringField("event"),
        jsonField("value")
      ],
      indices: { base: ["resourceId", "resource", "action", "event"] }
    },
    {
      name: "capture",
      version: 1,
      idPrefix: "capture",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        stringField("method", true, false, "MARKDOWN"),
        objectField("avatar"),
        jsonField("body"),
        stringField("file"),
        arrayField("childrenWithStructure", true, []),
        arrayField("rootStructure", true, []),
        arrayField("links"),
        arrayField("propertyConfig"),
        arrayField("propertyValues"),
        numberField("refreshId", true, false, 0),
        stringField("nodeId"),
        jsonField("clipboard")
      ],
      indices: { base: ["method"], search: ["label"] }
    },
    {
      name: "collection",
      version: 1,
      idPrefix: "collection",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        stringField("type", true),
        stringField("resource", true),
        stringField("typeToExtend", false, true),
        stringField("cover"),
        objectField("coverLayout"),
        stringField("description"),
        booleanField("isStarred", false, false),
        booleanField("isCaptureShortcutEnabled", false, false),
        stringField("query"),
        objectField("avatar"),
        stringField("importId")
      ],
      indices: {
        base: ["type", "resource", "typeToExtend"],
        search: ["label"]
      }
    },
    {
      name: "space",
      version: 1,
      idPrefix: "space",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        stringField("type", true),
        stringField("description"),
        objectField("avatar"),
        booleanField("isStarred", false, false),
        arrayField("items", true, [])
      ],
      indices: { base: ["type"], search: ["label"] }
    },
    {
      name: "event",
      version: 1,
      idPrefix: "event",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        stringField("event", true),
        numberField("startUnix"),
        numberField("endUnix"),
        jsonField("value")
      ],
      indices: { base: ["event", "startUnix", "endUnix"], search: ["event", "label"] }
    },
    {
      name: "file",
      version: 1,
      idPrefix: "file",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        stringField("type", true),
        numberField("size", true),
        numberField("duration"),
        stringField("name"),
        stringField("url"),
        stringField("thumbnailUrl"),
        jsonField("data"),
        jsonField("thumbnailData"),
        booleanField("isMeta", false, false),
        jsonField("metadata")
      ],
      indices: { base: ["type"], search: ["label"] }
    },
    {
      name: "objective",
      version: 1,
      idPrefix: "objective",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        {
          ...stringField("type", true),
          enum: ["INDEFINITE", "DEFINITE", "ROUTINE"] as const
        },
        jsonField("description"),
        dateField("startDate"),
        dateField("endDate"),
        stringField("spanScale"),
        stringField("subObjectivesLayout"),
        {
          ...stringField("status", true),
          enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const
        },
        numberField("color"),
        booleanField("isPinnedForQuickFocus", false, false),
        arrayField("tabsOrder"),
        objectField("uiState"),
        stringField("parentId", false, true),
        stringField("parentPath"),
        numberField("sortOrder"),
        ...commonShareFields
      ],
      indices: { base: ["type", "status", "parentId", "parentPath"], search: ["label"] }
    },
    {
      name: "linkTag",
      version: 1,
      idPrefix: "linkTag",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        stringField("group"),
        numberField("color"),
        objectField("avatar")
      ],
      indices: { search: ["label"] }
    },
    {
      name: "node",
      version: 1,
      idPrefix: "node",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        jsonField("body"),
        stringField("contentType", true),
        jsonField("metadata"),
        stringField("parent"),
        stringField("parentPath"),
        arrayField("mdChildOrder"),
        arrayField("mdParent"),
        numberField("sortOrder"),
        stringField("creationContext"),
        stringField("notes"),
        stringField("url"),
        stringField("file"),
        stringField("previewImage"),
        stringField("cover"),
        arrayField("avatar"),
        stringField("mdText"),
        stringField("text"),
        stringField("bodySearch"),
        stringField("labelSearch"),
        jsonField("config"),
        stringField("metaType"),
        dateField("date"),
        ...commonShareFields
      ],
      indices: {
        base: ["contentType", "metaType", "parent"],
        search: ["label", "text", "notes"]
      }
    },
    {
      name: "property",
      version: 1,
      idPrefix: "property",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        stringField("type"),
        stringField("resource"),
        stringField("propertyType"),
        jsonField("config"),
        arrayField("options"),
        booleanField("isRequired", false, false),
        booleanField("isMulti", false, false),
        booleanField("isShowOnNodePage", false, false),
        booleanField("isShowOnCapture", false, false),
        numberField("order"),
        jsonField("defaultValue"),
        objectField("avatar"),
        stringField("description"),
        stringField("importId")
      ],
      indices: { base: ["type", "resource", "propertyType"], search: ["label"] }
    },
    {
      name: "session",
      version: 1,
      idPrefix: "session",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        {
          ...stringField("type", true),
          enum: ["PREDEFINED_INTERVALS", "COUNTDOWN", "COUNTUP", "MANUAL_ENTRY"] as const
        },
        arrayField("blocks", true),
        numberField("elapsed", true),
        numberField("extended", true),
        stringField("start"),
        numberField("startUnix", true),
        stringField("end"),
        numberField("endUnix", true),
        stringField("plannedEnd"),
        numberField("plannedEndUnix"),
        stringField("manualEntryId", false, true),
        jsonField("notes")
      ],
      indices: { base: ["startUnix", "type"] }
    },
    {
      name: "sessionLog",
      version: 1,
      idPrefix: "sessionLog",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        stringField("start"),
        numberField("startUnix", true),
        stringField("end"),
        numberField("endUnix", true),
        stringField("sessionId", true),
        stringField("taskName"),
        numberField("focus"),
        numberField("breakTime"),
        stringField("objectiveId", false, true),
        stringField("taskId", false, true),
        stringField("manualEntryId", false, true),
        numberField("tzOffset"),
        arrayField("targets")
      ],
      indices: { base: ["startUnix", "objectiveId", "sessionId", "taskId"] }
    },
    {
      name: "task",
      version: 1,
      idPrefix: "task",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        booleanField("isChecked", false, false),
        numberField("estimated"),
        dateField("date"),
        numberField("dateUnix", true),
        numberField("minutes"),
        dateField("completedAt"),
        numberField("completedAtUnix", false, true),
        stringField("objectiveId", false, true),
        booleanField("isAncestorInactive", false, false)
      ],
      indices: { base: ["dateUnix", "objectiveId"], search: ["label"] }
    },
    {
      name: "vector",
      version: 1,
      idPrefix: "vector",
      isRemoteOnly: true,
      capabilities: systemCapabilities,
      defaultPermissions: false,
      fields: [
        idField,
        stringField("resourceId", true),
        stringField("resource", true),
        arrayField("embedding", true),
        jsonField("metadata")
      ],
      indices: { base: ["resourceId", "resource"], vector: ["embedding"] }
    },
    {
      name: "view",
      version: 1,
      idPrefix: "view",
      capabilities: shareableCapabilities,
      fields: [
        idField,
        labelField,
        stringField("layout", true),
        stringField("tabBy"),
        stringField("groupBy"),
        stringField("subGroupBy"),
        arrayField("tabs"),
        arrayField("properties"),
        stringField("arrangement"),
        booleanField("isHideThumbnailPreview", false, false),
        booleanField("isHideThumbnailTitle", false, false),
        numberField("density"),
        stringField("importId")
      ],
      indices: { base: ["layout", "tabBy", "groupBy"], search: ["label"] }
    }
  ],
  relations: [
    {
      from: "collection",
      to: "property",
      type: "many-many",
      relation: "properties",
      inverse: "schemaCollections",
      joinTable: "collection_properties",
      joinColumns: { from: "collectionId", to: "propertyId" },
      metadata: [
        { name: "sortOrder", type: "number" }
      ],
      capabilities: ["timestamps", "audit"]
    },
    {
      from: "collection",
      to: "collection",
      type: "many-one",
      relation: "typeToExtend",
      inverse: "extensionTypes",
      fkField: "typeToExtend"
    },
    {
      from: "collection",
      to: "view",
      type: "many-many",
      relation: "views",
      inverse: "collections",
      joinTable: "collection_views",
      joinColumns: { from: "collectionId", to: "viewId" },
      metadata: [
        { name: "sortOrder", type: "number" }
      ],
      capabilities: ["timestamps", "audit"]
    },
    {
      from: ["node", "objective"],
      to: "collection",
      type: "many-many",
      relation: "collections",
      inverse: "items",
      joinTable: "collection_items",
      joinColumns: { from: "itemId", to: "collectionId" },
      metadata: [
        { name: "location", type: "string" },
        { name: "sortOrder", type: "number" }
      ],
      capabilities: ["timestamps", "audit"]
    },
    {
      from: ["node", "objective", "task", "event"],
      to: ["node", "objective", "task", "event"],
      type: "many-many",
      relation: "links",
      inverse: "backlinks",
      joinTable: "record_links",
      joinColumns: { from: "in", to: "out" },
      metadata: [
        { name: "linkType", type: "string" },
        { name: "location", type: "string" },
        { name: "tags", type: "json" }
      ],
      identityMetadata: ["linkType"],
      capabilities: ["timestamps", "audit"]
    },
    {
      from: "space",
      to: ["node", "objective", "task", "collection", "file", "event"],
      type: "many-many",
      relation: "items",
      inverse: "spaces",
      joinTable: "space_items",
      joinColumns: { from: "spaceId", to: "itemId" },
      metadata: [
        { name: "itemType", type: "string" },
        { name: "label", type: "string" },
        { name: "description", type: "string" },
        { name: "sortOrder", type: "number" },
        { name: "parentId", type: "string" }
      ],
      capabilities: ["timestamps", "audit"]
    },
    {
      from: ["node", "objective"],
      to: "property",
      type: "many-many",
      relation: "propertyValues",
      inverse: "valueOwners",
      joinTable: "property_values",
      joinColumns: { from: "itemId", to: "propertyId" },
      metadata: [
        { name: "collectionId", type: "string" },
        { name: "value", type: "json" }
      ],
      capabilities: ["timestamps", "audit"]
    },
    {
      from: "node",
      to: "file",
      type: "many-one",
      relation: "file",
      inverse: "nodes",
      fkField: "file"
    },
    {
      from: "node",
      to: "node",
      type: "many-one",
      relation: "parent",
      inverse: "childNodes",
      fkField: "parent",
      inheritsInactive: true
    },
    {
      from: "objective",
      to: "objective",
      type: "htree",
      relation: "children",
      inverse: "parent",
      fkField: "parentId",
      pathField: "parentPath",
      inheritsInactive: true
    },
    {
      from: "task",
      to: "objective",
      type: "many-one",
      relation: "objective",
      inverse: "tasks",
      fkField: "objectiveId",
      inheritsInactive: true
    },
    {
      from: "session",
      to: ["objective", "task"],
      type: "many-many",
      relation: "items",
      inverse: "sessions",
      joinTable: "session_items",
      joinColumns: { from: "sessionId", to: "itemId" },
      metadata: [
        { name: "parentObjectiveId", type: "string" },
        { name: "sortOrder", type: "number" },
        { name: "blocks", type: "json" }
      ],
      capabilities: ["timestamps", "audit"],
      onDelete: "detach"
    },
    {
      from: "sessionLog",
      to: "session",
      type: "many-one",
      relation: "session",
      inverse: "logs",
      fkField: "sessionId",
      onDelete: { to: "cascade" }
    },
    {
      from: "sessionLog",
      to: "objective",
      type: "many-one",
      relation: "objective",
      inverse: "sessionLogs",
      fkField: "objectiveId"
    },
    {
      from: "sessionLog",
      to: "task",
      type: "many-one",
      relation: "task",
      inverse: "sessionLogs",
      fkField: "taskId"
    }
  ]
});

export type NucleumDatafnSchema = typeof nucleumDatafnSchema;
export type NucleumDatafnResource = NucleumDatafnSchema["resources"][number]["name"];

export default nucleumDatafnSchema;
