import type { ComposedDefinition } from "./features";
import { resolveProductTableNames } from "./features";
import { Product } from "./product.type";

type SchemaResource = ComposedDefinition["resources"][number];

/** Resource names declared by the DataFn schema features. */
export type InterfaceSchemaResource = SchemaResource["name"];

/** Fields DataFn adds to every shareable resource through its capabilities. */
export type InterfaceCapabilityField =
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "updatedBy"
  | "trashedAt"
  | "trashedBy"
  | "isArchived"
  | "visibility";

/** Declared and capability field names of one DataFn resource. */
export type InterfaceFieldName<Name extends InterfaceSchemaResource> =
  | Extract<SchemaResource, { name: Name }>["fields"][number]["name"]
  | InterfaceCapabilityField;

/** Apps that expose an MCP server, a versioned REST API, an SDK and a CLI. */
export const interfaceApps = ["memotron", "pointron", "nucleum"] as const;

/** One app with a public interface. */
export type InterfaceApp = (typeof interfaceApps)[number];

/**
 * Operations the generated interfaces may offer for a resource. Deletes,
 * trash and bulk operations are excluded from v1.
 */
export type InterfaceOperation = "list" | "get" | "create" | "update";

/**
 * How an app-scoped token sees a resource that more than one app uses. A
 * `nucleum` token is never filtered.
 *
 * - `field`: the row's `field` names the resource type it holds; list queries
 *   must filter it to the app's types and creates must set it to one of them.
 * - `collections`: the row is visible through the collections linked by the
 *   named collection relation, filtered by their `resource` field. Rows are
 *   filtered after the query runs, so lists are not paged.
 * - `links`: the row is visible through the links that name it in the
 *   `metadata` field of `joinTable`, by the types of their endpoints. Lists are
 *   not paged.
 * - `items`: the row is visible, and each entry of its `field` tree is
 *   visible when the type it points at is. Lists cannot filter or sort by it.
 */
export type InterfaceSharedFilter =
  | { kind: "field"; field: "resource"; paged: true }
  | { kind: "collections"; relation: "views"; paged: false }
  | { kind: "links"; joinTable: "record_links"; metadata: "tags"; paged: false }
  | { kind: "items"; field: "items"; paged: true };

/**
 * Exposure of one DataFn resource through MCP tools, REST routes and CLI
 * commands. `fields` is the fixed list and get projection; `filters` and
 * `sorts` are the list allowlists; `create` and `update` are the writable
 * field allowlists, or `false` when the operation is not offered. `shared`
 * is the filter app-scoped tokens see the resource through.
 */
export interface InterfaceResourceContract {
  resource: InterfaceSchemaResource;
  description: string;
  fields: readonly string[];
  filters: readonly string[];
  sorts: readonly string[];
  create: false | readonly string[];
  update: false | readonly string[];
  shared?: InterfaceSharedFilter;
}

/** A resource contract whose field names are checked against the schema. */
type InterfaceResourceDefinition<Name extends InterfaceSchemaResource> = Omit<
  InterfaceResourceContract,
  "resource" | "fields" | "filters" | "sorts" | "create" | "update"
> & {
  resource: Name;
  fields: readonly InterfaceFieldName<Name>[];
  filters: readonly InterfaceFieldName<Name>[];
  sorts: readonly InterfaceFieldName<Name>[];
  create: false | readonly InterfaceFieldName<Name>[];
  update: false | readonly InterfaceFieldName<Name>[];
};

/** One app's interface: its paths, scopes and exposed resources. */
export interface InterfaceAppContract {
  app: InterfaceApp;
  product: Product;
  mcpPath: `/mcp/${InterfaceApp}`;
  restPath: `/v1/${InterfaceApp}`;
  scopes: { read: `${InterfaceApp}:read`; write: `${InterfaceApp}:write` };
  resources: readonly InterfaceExposedResource[];
}

const recordMeta = ["isArchived", "createdAt", "updatedAt"] as const;
const recordSorts = ["createdAt", "updatedAt"] as const;

function defineResource<const Name extends InterfaceSchemaResource>(
  definition: InterfaceResourceDefinition<Name>
): InterfaceResourceContract & { resource: Name } {
  return definition;
}

/** Resource contracts shared by every app that exposes the resource. */
export const interfaceResources = {
  node: defineResource({
    resource: "node",
    description: "Notes, links and other memory nodes.",
    fields: [
      "id",
      "label",
      "contentType",
      "metaType",
      "url",
      "notes",
      "text",
      "parent",
      "date",
      "isStarred",
      "isLocked",
      ...recordMeta
    ],
    filters: ["contentType", "metaType", "parent", "isStarred", "isArchived"],
    sorts: ["label", "date", ...recordSorts],
    create: ["label", "contentType", "url", "notes", "parent", "date", "isStarred"],
    update: ["label", "url", "notes", "parent", "date", "isStarred", "isLocked"]
  }),
  file: defineResource({
    resource: "file",
    description: "File records; uploads go through the files API.",
    fields: [
      "id",
      "label",
      "name",
      "type",
      "size",
      "duration",
      "url",
      "thumbnailUrl",
      "fileId",
      ...recordMeta
    ],
    filters: ["type", "isArchived"],
    sorts: ["label", "size", ...recordSorts],
    create: false,
    update: false
  }),
  objective: defineResource({
    resource: "objective",
    description: "Goals, projects and routines with optional parents.",
    fields: [
      "id",
      "label",
      "type",
      "status",
      "description",
      "startDate",
      "endDate",
      "parentId",
      "color",
      "sortOrder",
      "isPinnedForQuickFocus",
      "isStarred",
      "isLocked",
      ...recordMeta
    ],
    filters: [
      "type",
      "status",
      "parentId",
      "isPinnedForQuickFocus",
      "isStarred",
      "isArchived"
    ],
    sorts: ["label", "sortOrder", "startDate", "endDate", ...recordSorts],
    create: [
      "label",
      "type",
      "status",
      "description",
      "startDate",
      "endDate",
      "parentId",
      "color",
      "sortOrder",
      "isPinnedForQuickFocus",
      "isStarred"
    ],
    update: [
      "label",
      "status",
      "description",
      "startDate",
      "endDate",
      "color",
      "sortOrder",
      "isPinnedForQuickFocus",
      "isStarred",
      "isLocked"
    ]
  }),
  task: defineResource({
    resource: "task",
    description: "Dated tasks, optionally under an objective.",
    fields: [
      "id",
      "label",
      "isChecked",
      "date",
      "dateUnix",
      "estimated",
      "minutes",
      "completedAt",
      "completedAtUnix",
      "objectiveId",
      ...recordMeta
    ],
    filters: ["isChecked", "dateUnix", "objectiveId", "isArchived"],
    sorts: ["label", "dateUnix", "completedAtUnix", ...recordSorts],
    create: ["label", "date", "dateUnix", "estimated", "objectiveId", "isChecked"],
    update: [
      "label",
      "date",
      "dateUnix",
      "estimated",
      "objectiveId",
      "isChecked",
      "completedAt",
      "completedAtUnix"
    ]
  }),
  session: defineResource({
    resource: "session",
    description: "Focus sessions; started and stopped by the focus tools.",
    fields: [
      "id",
      "type",
      "start",
      "startUnix",
      "end",
      "endUnix",
      "plannedEndUnix",
      "elapsed",
      "extended",
      "createdAt",
      "updatedAt"
    ],
    filters: ["type", "startUnix", "endUnix"],
    sorts: ["startUnix", "endUnix", ...recordSorts],
    create: false,
    update: false
  }),
  sessionLog: defineResource({
    resource: "sessionLog",
    description: "Focus time logged against sessions, objectives and tasks.",
    fields: [
      "id",
      "sessionId",
      "objectiveId",
      "taskId",
      "taskName",
      "start",
      "startUnix",
      "end",
      "endUnix",
      "focus",
      "breakTime",
      "tzOffset",
      "createdAt",
      "updatedAt"
    ],
    filters: ["sessionId", "objectiveId", "taskId", "startUnix", "endUnix"],
    sorts: ["startUnix", "endUnix", ...recordSorts],
    create: false,
    update: false
  }),
  event: defineResource({
    resource: "event",
    description: "Calendar events.",
    fields: ["id", "label", "event", "startUnix", "endUnix", "value", ...recordMeta],
    filters: ["event", "startUnix", "endUnix", "isArchived"],
    sorts: ["label", "startUnix", "endUnix", ...recordSorts],
    create: ["label", "event", "startUnix", "endUnix", "value"],
    update: ["label", "startUnix", "endUnix", "value"]
  }),
  collection: defineResource({
    resource: "collection",
    description: "Collections and types of the app's records.",
    fields: [
      "id",
      "label",
      "type",
      "resource",
      "typeToExtend",
      "description",
      "isStarred",
      ...recordMeta
    ],
    filters: ["resource", "type", "typeToExtend", "isStarred", "isArchived"],
    sorts: ["label", ...recordSorts],
    create: ["label", "type", "resource", "typeToExtend", "description", "isStarred"],
    update: ["label", "description", "isStarred"],
    shared: { kind: "field", field: "resource", paged: true }
  }),
  property: defineResource({
    resource: "property",
    description: "Properties defined for the app's records.",
    fields: [
      "id",
      "label",
      "type",
      "resource",
      "propertyType",
      "options",
      "isRequired",
      "isMulti",
      "description",
      "order",
      ...recordMeta
    ],
    filters: ["resource", "type", "propertyType", "isArchived"],
    sorts: ["label", "order", ...recordSorts],
    create: [
      "label",
      "type",
      "resource",
      "propertyType",
      "options",
      "isRequired",
      "isMulti",
      "description",
      "order"
    ],
    update: ["label", "options", "isRequired", "isMulti", "description", "order"],
    shared: { kind: "field", field: "resource", paged: true }
  }),
  view: defineResource({
    resource: "view",
    description: "Saved collection views.",
    fields: ["id", "label", "layout", "tabBy", "groupBy", "subGroupBy", ...recordMeta],
    filters: ["layout", "isArchived"],
    sorts: ["label", ...recordSorts],
    create: false,
    update: false,
    shared: { kind: "collections", relation: "views", paged: false }
  }),
  linkTag: defineResource({
    resource: "linkTag",
    description: "Tags applied to links between records.",
    fields: ["id", "label", "group", "color", ...recordMeta],
    filters: ["group", "isArchived"],
    sorts: ["label", ...recordSorts],
    create: false,
    update: false,
    shared: {
      kind: "links",
      joinTable: "record_links",
      metadata: "tags",
      paged: false
    }
  }),
  space: defineResource({
    resource: "space",
    description: "Spaces that group items from the app.",
    fields: ["id", "label", "description", "view", "items", "isStarred", ...recordMeta],
    filters: ["isStarred", "isArchived"],
    sorts: ["label", ...recordSorts],
    create: ["label", "description", "isStarred"],
    update: ["label", "description", "isStarred"],
    shared: { kind: "items", field: "items", paged: true }
  })
} as const;

/** A resource the interfaces expose. */
export type InterfaceExposedResource = keyof typeof interfaceResources;

/**
 * Schema resources no interface exposes, with the reason. Every other
 * resource of an app's product features must be exposed by that app.
 */
export const interfaceInternalResources = {
  accessLog: "Remote-only audit of record access, written by the clients.",
  vector: "Remote-only embeddings with no DataFn read policy.",
  capture: "Capture editor drafts; the capture tools create nodes instead."
} as const satisfies Partial<Record<InterfaceSchemaResource, string>>;

const memotronResources = [
  "node",
  "file",
  "collection",
  "property",
  "view",
  "linkTag",
  "space"
] as const satisfies readonly InterfaceExposedResource[];

const pointronResources = [
  "objective",
  "task",
  "session",
  "sessionLog",
  "event",
  "collection",
  "property",
  "view",
  "linkTag",
  "space"
] as const satisfies readonly InterfaceExposedResource[];

function appContract(
  app: InterfaceApp,
  product: Product,
  resources: readonly InterfaceExposedResource[]
): InterfaceAppContract {
  return {
    app,
    product,
    mcpPath: `/mcp/${app}`,
    restPath: `/v1/${app}`,
    scopes: { read: `${app}:read`, write: `${app}:write` },
    resources
  };
}

/** Per-app interface contract the MCP servers, REST API and CLIs are generated from. */
export const interfaceContract: Readonly<Record<InterfaceApp, InterfaceAppContract>> = {
  memotron: appContract("memotron", Product.MEMOTRON, memotronResources),
  pointron: appContract("pointron", Product.POINTRON, pointronResources),
  nucleum: appContract("nucleum", Product.NUCLEUM, [
    ...new Set<InterfaceExposedResource>([...memotronResources, ...pointronResources])
  ])
};

/** The resource contracts one app exposes, in declaration order. */
export function resolveInterfaceResources(
  app: InterfaceApp
): InterfaceResourceContract[] {
  return interfaceContract[app].resources.map((name) => interfaceResources[name]);
}

/**
 * Resource types an app's token sees in shared resources: a `field` filter
 * value, a linked collection's `resource`, a link endpoint or a space item
 * type must be one of them. `all` means the token is never filtered.
 */
export function resolveInterfaceVisibleTypes(
  app: InterfaceApp
): "all" | readonly string[] {
  if (app === "nucleum") return "all";
  return resolveProductTableNames(interfaceContract[app].product);
}

/**
 * The filter an app applies to a resource it exposes, or `null` when the
 * app's token reads it unfiltered: the app owns it alone, or the app is
 * `nucleum`. Throws for a resource the app does not expose.
 */
export function resolveInterfaceSharedFilter(
  app: InterfaceApp,
  resource: InterfaceExposedResource
): InterfaceSharedFilter | null {
  if (!interfaceContract[app].resources.includes(resource)) {
    throw new Error(`The ${app} interface does not expose ${resource}`);
  }
  if (app === "nucleum") return null;
  return interfaceResources[resource].shared ?? null;
}

/** True when an app may run an operation on a resource. Never true for deletes. */
export function isInterfaceOperationAllowed(
  app: InterfaceApp,
  resource: string,
  operation: string
): boolean {
  if (!(interfaceContract[app].resources as readonly string[]).includes(resource)) {
    return false;
  }
  const contract = interfaceResources[resource as InterfaceExposedResource];
  if (operation === "list" || operation === "get") return true;
  if (operation === "create") return contract.create !== false;
  if (operation === "update") return contract.update !== false;
  return false;
}
