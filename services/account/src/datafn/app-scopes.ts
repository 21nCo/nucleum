import {
  endpointIncludes,
  endpointList,
  findRelationMatch,
  getRelationFkFieldsForResource,
  parseSortTerm,
  relationFkFieldForManyOne,
  relationFkFieldForOneMany,
  relationTargetEndpoint,
  resolveEndpointResource,
  type DatafnRelationEndpoint,
  type DatafnSchema
} from '@datafn/core';
import type { DataFnAction } from '@datafn/server';
import { defineAuthFnScopes, hasScopes, type AuthFnSession } from 'authfn';
import {
  SCOPED_APPS,
  resourceOwnership,
  type ResourceOwnership,
  type ScopedApp,
  type SharedResourcePolicy
} from './resource-ownership.js';

/**
 * Account scope registry: each app grants `read` and `write`, and `*` grants
 * every registered scope. `nucleum` tokens see every resource.
 */
export const accountScopeRegistry = defineAuthFnScopes({
  memotron: ['read', 'write'],
  pointron: ['read', 'write'],
  nucleum: ['read', 'write']
});

/** Apps a session may reach for one action, or `all` for a `nucleum` grant. */
export type AppGrant = 'all' | ReadonlySet<ScopedApp>;

/** The read and write app grants a session carries. */
export interface AppScopeAccess {
  read: AppGrant;
  write: AppGrant;
}

/** One equality or membership condition for an `AppScopeStore` read. */
export interface AppScopeWhere {
  field: string;
  operator: 'eq' | 'in';
  value: unknown;
}

/**
 * Reads stored rows of a resource or join table in the caller's namespace.
 * Scope checks use it to find a shared record's owner before a write, and the
 * collections or links that make a view or link tag visible to an app.
 */
export interface AppScopeStore {
  findMany(model: string, where: readonly AppScopeWhere[]): Promise<Record<string, unknown>[]>;
}

/** Inputs for one `authorizeAppScopes` decision. */
export interface AuthorizeAppScopesInput {
  access: AppScopeAccess;
  action: DataFnAction;
  payload: unknown;
  schema: DatafnSchema;
  store: AppScopeStore;
  ownership?: ResourceOwnership;
}

/** Resolves a session's scopes into the apps it may read and write. */
export function resolveAppScopeAccess(
  session: Pick<AuthFnSession, 'scopes'>
): AppScopeAccess {
  return {
    read: resolveGrant(session, 'read'),
    write: resolveGrant(session, 'write')
  };
}

/** True when both grants cover every resource, as for cookie sessions. */
export function hasFullAppAccess(access: AppScopeAccess): boolean {
  return access.read === 'all' && access.write === 'all';
}

function resolveGrant(
  session: Pick<AuthFnSession, 'scopes'>,
  action: 'read' | 'write'
): AppGrant {
  const options = { registry: accountScopeRegistry };
  if (hasScopes(session, `nucleum:${action}`, options)) return 'all';
  return new Set(
    SCOPED_APPS.filter((app) => hasScopes(session, `${app}:${action}`, options))
  );
}

/**
 * Decides whether a DataFn request stays inside the session's app grants.
 * A scoped grant reaches its apps' own resources, shared resources only
 * through their filter, and never whole-namespace sync (clone, pull, seed,
 * reconcile). Unrecognized payload shapes, including non-object filters,
 * are denied.
 */
export async function authorizeAppScopes(
  input: AuthorizeAppScopesInput
): Promise<boolean> {
  const ownership = input.ownership ?? resourceOwnership;
  const shared = createSharedVisibility(input.store);
  const read = createScopeView(input.access.read, ownership, input.schema, shared);
  const write = createScopeView(input.access.write, ownership, input.schema, shared);
  const { payload } = input;
  switch (input.action) {
    case 'status':
      return true;
    case 'query':
      return asList(payload).every((query) => read.canQuery(query));
    case 'search':
      return read.canSearch(payload);
    case 'mutation':
      return everyAsync(asList(payload), (m) => write.canMutate(m));
    case 'push':
      return isRecord(payload) && Array.isArray(payload.mutations) &&
        everyAsync(payload.mutations, (m) => write.canMutate(m));
    case 'transact':
      return isRecord(payload) && Array.isArray(payload.steps) &&
        everyAsync(payload.steps, async (step) => {
          if (!isRecord(step)) return false;
          if ('query' in step && !('mutation' in step)) return read.canQuery(step.query);
          if ('mutation' in step && !('query' in step)) return write.canMutate(step.mutation);
          return false;
        });
    case 'clone':
    case 'pull':
      return read.full;
    case 'seed':
    case 'reconcile':
      return read.full && write.full;
    default:
      return false;
  }
}

const RELATION_OPERATIONS = new Set(['relate', 'unrelate', 'modifyRelation']);
const LOGICAL_FILTER_KEYS = new Set(['and', 'or', 'not']);
const SPACE_ITEM_TYPES = { section: 'section', resource: 'resource', page: 'page' };
const DERIVED_QUERY_DENIED_KEYS = [
  'groupBy', 'aggregations', 'having', 'temporal', 'count', 'limit', 'offset', 'cursor'
] as const;

interface ScopeView {
  full: boolean;
  canQuery(query: unknown): boolean;
  canSearch(payload: unknown): boolean;
  canMutate(mutation: unknown): Promise<boolean>;
}

type DerivedPolicy = Extract<SharedResourcePolicy, { kind: 'collections' | 'linkTags' }>;
type FieldPolicy = Extract<SharedResourcePolicy, { kind: 'field' }>;

/**
 * Values a field policy's field may hold for a grant. A field that names the
 * type of one record (an access log's `resource`, beside `resourceId`) may
 * not name a shared type, whose visibility depends on that record's own
 * policy, so scoped grants reach only logs of their apps' own resources.
 */
function fieldPolicyValues(
  policy: FieldPolicy,
  tables: ReadonlySet<string>,
  ownership: ResourceOwnership
): ReadonlySet<string> {
  if (!policy.recordField) return tables;
  return new Set([...tables].filter((name) => !ownership.shared.has(name)));
}

/** Per-request reads behind shared-resource checks, cached for one request. */
interface SharedVisibility {
  readRecord(resource: string, id: string): Promise<Record<string, unknown> | null>;
  /** Stored rows of `resource` by id, for the ids that exist. */
  readRecords(resource: string, ids: readonly string[]): Promise<Map<string, Record<string, unknown>>>;
  /** Resource field values of the collections linked to each record id. */
  linkedCollectionResources(
    policy: Extract<DerivedPolicy, { kind: 'collections' }>,
    ids: readonly string[]
  ): Promise<Map<string, unknown[]>>;
  /** Endpoint resource pairs of the links whose tags name each tag id. */
  tagUses(
    policy: Extract<DerivedPolicy, { kind: 'linkTags' }>
  ): Promise<Map<string, Array<readonly [unknown, unknown]>>>;
}

function createSharedVisibility(store: AppScopeStore): SharedVisibility {
  let tagUses: Promise<Map<string, Array<readonly [unknown, unknown]>>> | undefined;
  return {
    async readRecord(resource, id) {
      const rows = await store.findMany(resource, [{ field: 'id', operator: 'eq', value: id }]);
      return rows[0] ?? null;
    },
    async readRecords(resource, ids) {
      if (ids.length === 0) return new Map();
      const rows = await store.findMany(resource, [{ field: 'id', operator: 'in', value: [...ids] }]);
      return new Map(rows.map((row) => [String(row.id), row]));
    },
    async linkedCollectionResources(policy, ids) {
      const result = new Map<string, unknown[]>(ids.map((id) => [id, []]));
      if (ids.length === 0) return result;
      const links = await store.findMany(policy.joinTable, [
        { field: policy.recordColumn, operator: 'in', value: [...ids] }
      ]);
      const collectionIds = [...new Set(links.map((link) => link[policy.collectionColumn]))]
        .filter((id): id is string => typeof id === 'string');
      const collections = collectionIds.length === 0
        ? []
        : await store.findMany('collection', [{ field: 'id', operator: 'in', value: collectionIds }]);
      const resourceById = new Map(collections.map((row) => [row.id, row.resource]));
      for (const link of links) {
        const owner = result.get(String(link[policy.recordColumn]));
        // A link to a missing collection keeps an unknown owner, which no grant covers.
        owner?.push(resourceById.get(link[policy.collectionColumn]));
      }
      return result;
    },
    tagUses(policy) {
      tagUses ??= store.findMany(policy.joinTable, []).then((links) => {
        const uses = new Map<string, Array<readonly [unknown, unknown]>>();
        for (const link of links) {
          for (const tag of parseTags(link[policy.tagsField])) {
            const list = uses.get(tag) ?? [];
            list.push([link[policy.fromResourceColumn], link[policy.toResourceColumn]] as const);
            uses.set(tag, list);
          }
        }
        return uses;
      });
      return tagUses;
    }
  };
}

/**
 * Returns the ids among `ids` that a grant's tables may read (`read`) or
 * write (`write`) for a resource filtered through linked collections or
 * tagged links. Reading needs one linked collection or tagged link inside the
 * grant; writing needs every one of them inside it, so a record no other
 * app uses yet is writable but not readable.
 */
async function derivedAccess(
  policy: DerivedPolicy,
  ids: readonly string[],
  tables: ReadonlySet<string>,
  mode: 'read' | 'write',
  shared: SharedVisibility
): Promise<Set<string>> {
  const inGrant = (value: unknown) => typeof value === 'string' && tables.has(value);
  const decide = (owners: readonly boolean[]) =>
    mode === 'read' ? owners.some(Boolean) : owners.every(Boolean);
  const allowed = new Set<string>();
  if (policy.kind === 'collections') {
    const linked = await shared.linkedCollectionResources(policy, ids);
    for (const id of ids) {
      if (decide((linked.get(id) ?? []).map(inGrant))) allowed.add(id);
    }
    return allowed;
  }
  const uses = await shared.tagUses(policy);
  for (const id of ids) {
    const owners = (uses.get(id) ?? []).map(([from, to]) => inGrant(from) && inGrant(to));
    if (decide(owners)) allowed.add(id);
  }
  return allowed;
}

/** Inputs for deciding which items of space item trees a grant may see. */
interface SpaceItemAccessInput {
  lists: readonly unknown[];
  tables: ReadonlySet<string>;
  mode: 'read' | 'write';
  ownership: ResourceOwnership;
  schema: DatafnSchema;
  shared: SharedVisibility;
  /** Field-policy records written earlier in the same request. */
  pending?: ReadonlySet<string>;
}

/**
 * Returns whether one space item (not its children) is visible to a grant.
 * Sections and page links are. A resource item is visible when its type is in
 * the grant and its id does not name another resource; one that points at a
 * shared resource also needs the stored record to pass that resource's own
 * policy, looked up once per type for all `lists`: a `resource` field inside
 * the grant (collections, properties, access logs) or the linked collections
 * and tagged links (views, link tags). Spaces and missing records are hidden.
 */
async function resolveSpaceItemAccess(
  input: SpaceItemAccessInput
): Promise<(item: Record<string, unknown>) => boolean> {
  const { tables, ownership, schema, shared } = input;
  const refs = new Map<string, Set<string>>();
  for (const list of input.lists) collectResourceItemRefs(list, refs);
  const visibleShared = new Set<string>();
  for (const [resource, idSet] of refs) {
    const policy = ownership.shared.get(resource);
    if (!policy || !tables.has(resource)) continue;
    const ids = [...idSet];
    if (policy.kind === 'field') {
      const values = fieldPolicyValues(policy, tables, ownership);
      const stored = await shared.readRecords(resource, ids);
      for (const id of ids) {
        const owner = stored.get(id)?.[policy.field];
        if (input.pending?.has(`${resource}|${id}`) ||
          (typeof owner === 'string' && values.has(owner))) {
          visibleShared.add(`${resource}|${id}`);
        }
      }
    } else if (isDerivedPolicy(policy)) {
      const allowed = await derivedAccess(policy, ids, tables, input.mode, shared);
      for (const id of allowed) visibleShared.add(`${resource}|${id}`);
    }
  }
  return (item) => {
    if (item.type === SPACE_ITEM_TYPES.page || item.type === SPACE_ITEM_TYPES.section) {
      return true;
    }
    const { resourceType, resourceId } = item;
    if (item.type !== SPACE_ITEM_TYPES.resource || typeof resourceType !== 'string' ||
      typeof resourceId !== 'string' || !tables.has(resourceType)) {
      return false;
    }
    const named = resourceNamedById(schema, resourceId);
    if (named !== undefined && named !== resourceType) return false;
    return !ownership.shared.has(resourceType) || visibleShared.has(`${resourceType}|${resourceId}`);
  };
}

function collectResourceItemRefs(list: unknown, refs: Map<string, Set<string>>, depth = 0): void {
  if (depth > 32 || !Array.isArray(list)) return;
  for (const item of list) {
    if (!isRecord(item)) continue;
    if (item.type === SPACE_ITEM_TYPES.resource && typeof item.resourceType === 'string' &&
      typeof item.resourceId === 'string') {
      const ids = refs.get(item.resourceType) ?? new Set<string>();
      ids.add(item.resourceId);
      refs.set(item.resourceType, ids);
    }
    collectResourceItemRefs(item.children, refs, depth + 1);
  }
}

/** The resource whose generated id prefix (`<idPrefix or name>:`) starts `id`, if any. */
function resourceNamedById(schema: DatafnSchema, id: string): string | undefined {
  let best: { name: string; length: number } | undefined;
  for (const resource of schema.resources) {
    const prefix = `${resource.idPrefix ?? resource.name}:`;
    if (id.startsWith(prefix) && (!best || prefix.length > best.length)) {
      best = { name: resource.name, length: prefix.length };
    }
  }
  return best?.name;
}

/** One record field that stores a relation's foreign key, with its target. */
interface RecordRelationField {
  field: string;
  resourceField?: string;
  endpoint: DatafnRelationEndpoint;
}

const recordRelationFieldCache = new WeakMap<DatafnSchema, Map<string, RecordRelationField[]>>();

/**
 * Lists the foreign-key fields a resource's records carry, the same fields
 * DataFn derives for many-one, one-many and htree relations, so a write that
 * sets one relates the record without going through `relations`.
 */
function recordRelationFields(schema: DatafnSchema, resource: string): RecordRelationField[] {
  let bySchema = recordRelationFieldCache.get(schema);
  if (!bySchema) {
    bySchema = new Map();
    recordRelationFieldCache.set(schema, bySchema);
  }
  const cached = bySchema.get(resource);
  if (cached) return cached;
  const resourceFields = new Map(
    getRelationFkFieldsForResource(schema, resource).map((fk) => [fk.field, fk.resourceField])
  );
  const fields: RecordRelationField[] = [];
  for (const relation of schema.relations ?? []) {
    let field: string;
    let endpoint: DatafnRelationEndpoint;
    if (relation.type === 'many-one' && endpointIncludes(relation.from, resource)) {
      field = relationFkFieldForManyOne(relation);
      endpoint = relation.to;
    } else if (relation.type === 'one-many' && endpointIncludes(relation.to, resource)) {
      field = relationFkFieldForOneMany(relation);
      endpoint = relation.from;
    } else if (relation.type === 'htree' && endpointIncludes(relation.to, resource)) {
      field = relation.fkField || relation.foreignKey || relation.inverse || 'parentId';
      endpoint = relation.from;
    } else {
      continue;
    }
    fields.push({ field, endpoint, resourceField: resourceFields.get(field) });
  }
  bySchema.set(resource, fields);
  return fields;
}

/** Relation metadata fields that name a record by id, such as `collectionId`. */
function idMetadataFields(relation: { metadata?: readonly { name: string }[] }): string[] {
  return (relation.metadata ?? []).map((field) => field.name).filter((name) => /Id$/.test(name));
}

/**
 * Relation item metadata keys DataFn would spread over a join row's identity:
 * the row id and the join columns that name both endpoints.
 */
function identityMetadataFields(relation: { joinColumns?: { from?: string; to?: string } }): string[] {
  return ['id', relation.joinColumns?.from || 'from', relation.joinColumns?.to || 'to'];
}

function isClearedValue(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function isDerivedPolicy(policy: SharedResourcePolicy | undefined): policy is DerivedPolicy {
  return policy?.kind === 'collections' || policy?.kind === 'linkTags';
}

function linkTagPolicy(ownership: ResourceOwnership): Extract<DerivedPolicy, { kind: 'linkTags' }> | undefined {
  for (const policy of ownership.shared.values()) {
    if (policy.kind === 'linkTags') return policy;
  }
  return undefined;
}

function parseTags(value: unknown): string[] {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
}

interface RelationItem {
  toId: string;
  metadata: Record<string, unknown>;
}

/** Mirrors DataFn's relation payload normalization; `null` for a malformed payload. */
function relationItems(payload: unknown, depth = 0): RelationItem[] | null {
  if (depth > 8) return null;
  if (typeof payload === 'string') return [{ toId: payload, metadata: {} }];
  if (Array.isArray(payload)) {
    const items: RelationItem[] = [];
    for (const entry of payload) {
      const nested = relationItems(entry, depth + 1);
      if (!nested) return null;
      items.push(...nested);
    }
    return items;
  }
  if (isRecord(payload)) {
    const { $ref, ...metadata } = payload;
    return typeof $ref === 'string' && $ref.length > 0 ? [{ toId: $ref, metadata }] : null;
  }
  return null;
}

function createScopeView(
  grant: AppGrant,
  ownership: ResourceOwnership,
  schema: DatafnSchema,
  shared: SharedVisibility
): ScopeView {
  if (grant === 'all') {
    return {
      full: true,
      canQuery: () => true,
      canSearch: () => true,
      canMutate: async () => true
    };
  }
  const tables = grantTables(grant, ownership);
  const isExclusive = (name: string) => tables.has(name) && !ownership.shared.has(name);

  const pathAllowed = (resource: string, path: readonly string[]): boolean => {
    let current = [resource];
    for (const segment of path) {
      const next: string[] = [];
      for (const name of current) {
        const match = findRelationMatch(schema, name, segment);
        if (!match) continue;
        const targets = endpointList(relationTargetEndpoint(match.relation, match.direction));
        if (!targets.every(isExclusive)) return false;
        next.push(...targets);
      }
      if (next.length === 0) return true;
      current = next;
    }
    return true;
  };

  const relationTargets = (resource: string, relation: string): string[] => {
    const match = findRelationMatch(schema, resource, relation);
    return match ? endpointList(relationTargetEndpoint(match.relation, match.direction)) : [];
  };

  const filterAllowed = (resource: string, filter: unknown, depth = 0): boolean => {
    if (depth > 16) return false;
    if (Array.isArray(filter)) {
      return filter.every((entry) => filterAllowed(resource, entry, depth + 1));
    }
    if (!isRecord(filter)) return true;
    return Object.entries(filter).every(([key, value]) => {
      if (key.startsWith('$') || LOGICAL_FILTER_KEYS.has(key)) {
        return filterAllowed(resource, value, depth + 1);
      }
      const path = key.split('.');
      if (!pathAllowed(resource, path)) return false;
      const targets = relationTargets(resource, path[0]);
      return targets.every((target) => filterAllowed(target, value, depth + 1));
    });
  };

  const fieldPathsAllowed = (resource: string, query: Record<string, unknown>) => {
    const paths: unknown[] = [];
    if (query.select !== undefined) {
      if (!Array.isArray(query.select)) return false;
      paths.push(...query.select);
    }
    if (query.groupBy !== undefined) {
      paths.push(...(Array.isArray(query.groupBy) ? query.groupBy : [query.groupBy]));
    }
    if (isRecord(query.aggregations)) {
      for (const aggregation of Object.values(query.aggregations)) {
        if (isRecord(aggregation) && aggregation.field !== undefined) {
          paths.push(aggregation.field);
        }
      }
    }
    return paths.every((token) =>
      typeof token === 'string' && pathAllowed(resource, token.split('.'))
    );
  };

  const allowedValue = (value: unknown) => typeof value === 'string' && tables.has(value);
  const fieldValueAllowed = (policy: FieldPolicy, value: unknown) =>
    typeof value === 'string' && fieldPolicyValues(policy, tables, ownership).has(value);

  /**
   * A row that names one record (an access log's `resourceId`) must name a
   * record of the type in its field, before and after the write, so a log of
   * an app's own type cannot name another app's or a shared record. An id
   * with no resource prefix names no record and is allowed.
   */
  const recordFieldBound = (
    policy: FieldPolicy,
    record: Record<string, unknown> | undefined,
    existing: Record<string, unknown> | null,
    operation: string
  ): boolean => {
    const recordField = policy.recordField;
    if (!recordField) return true;
    const bound = (row: Record<string, unknown>) => {
      const recordId = row[recordField];
      if (isClearedValue(recordId)) return true;
      if (typeof recordId !== 'string') return false;
      const named = resourceNamedById(schema, recordId);
      return named === undefined || named === row[policy.field];
    };
    if (existing && !bound(existing)) return false;
    if (!record) return true;
    // A merge keeps the stored fields it does not set; other writes replace them.
    return bound(operation === 'merge' ? { ...(existing ?? {}), ...record } : record);
  };

  const canQuery = (query: unknown): boolean => {
    if (!isRecord(query) || typeof query.resource !== 'string') return false;
    if (query.filters !== undefined && !isRecord(query.filters)) return false;
    const resource = query.resource;
    if (!tables.has(resource)) return false;
    if (query.relation !== undefined) {
      if (typeof query.relation !== 'string') return false;
      const targets = relationTargets(resource, query.relation);
      return targets.length > 0 && pathAllowed(resource, [query.relation]) &&
        [resource, ...targets].every((name) =>
          filterAllowed(name, query.filters) && fieldPathsAllowed(name, query)
        );
    }
    if (!filterAllowed(resource, query.filters) || !fieldPathsAllowed(resource, query)) {
      return false;
    }
    const policy = ownership.shared.get(resource);
    if (!policy) return true;
    if (query.operation !== undefined || readsOtherNamespaces(query.metadata)) return false;
    if (policy.kind === 'field') {
      return constrainsField(query.filters, policy.field, fieldPolicyValues(policy, tables, ownership));
    }
    if (policy.kind === 'items') {
      return query.groupBy === undefined && query.aggregations === undefined &&
        query.having === undefined && !filterReferences(query.filters, policy.field) &&
        !sortReferences(query.sort, policy.field);
    }
    if (isDerivedPolicy(policy)) {
      // Rows are filtered after the query runs, so nothing may summarize them
      // or page through them: a page cursor carries its last row's values.
      // Rows are filtered by id, so a projection must keep it.
      return DERIVED_QUERY_DENIED_KEYS.every((key) => query[key] === undefined) &&
        selectKeepsId(query.select);
    }
    return false;
  };

  const canSearch = (payload: unknown): boolean => {
    if (!isRecord(payload) || !Array.isArray(payload.resources)) return false;
    const resources = payload.resources;
    if (resources.length === 0 || !resources.every((name) => typeof name === 'string' && isExclusive(name))) {
      return false;
    }
    if (payload.filters === undefined) return true;
    if (!isRecord(payload.filters)) return false;
    return Object.entries(payload.filters).every(([name, filter]) =>
      resources.includes(name) && filterAllowed(name, filter)
    );
  };

  /** Field-policy records inserted earlier in the same request, by `resource|id`. */
  const pendingOwned = new Set<string>();
  const tagPolicy = linkTagPolicy(ownership);

  /**
   * True when every item of each space item tree in `lists` is one the write
   * grant may see, so a write can neither add nor drop a hidden item.
   */
  const itemsWritable = async (lists: readonly unknown[]): Promise<boolean> => {
    if (lists.some((items) => !isClearedList(items) && !Array.isArray(items))) return false;
    const visible = await resolveSpaceItemAccess({
      lists, tables, mode: 'write', ownership, schema, shared, pending: pendingOwned
    });
    return lists.every((items) => isClearedList(items) ||
      (items as unknown[]).every((item) => spaceItemVisible(item, visible)));
  };

  /**
   * The resource a relation endpoint resolves `id` to, or `undefined` when
   * none does or the id's own prefix names a different resource.
   */
  const resolveTarget = (endpoint: DatafnRelationEndpoint, id: string): string | undefined => {
    const target = resolveEndpointResource(endpoint, id, schema);
    const named = resourceNamedById(schema, id);
    return named === undefined || named === target ? target : undefined;
  };

  const targetAllowed = async (target: string, id: string): Promise<boolean> => {
    if (!tables.has(target)) return false;
    const policy = ownership.shared.get(target);
    if (!policy) return true;
    if (policy.kind === 'field') {
      if (pendingOwned.has(`${target}|${id}`)) return true;
      const stored = await shared.readRecord(target, id);
      return stored !== null && fieldValueAllowed(policy, stored[policy.field]);
    }
    if (isDerivedPolicy(policy)) {
      return (await derivedAccess(policy, [id], tables, 'write', shared)).has(id);
    }
    return false;
  };

  /** A link may carry a tag that is unused or already visible to the grant. */
  const tagsUsable = async (tags: unknown): Promise<boolean> => {
    if (tags === undefined || tags === null) return true;
    if (!tagPolicy || !Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
      return false;
    }
    const uses = await shared.tagUses(tagPolicy);
    return tags.every((tag) => {
      const owners = uses.get(tag) ?? [];
      return owners.length === 0 ||
        owners.some(([from, to]) => allowedValue(from) && allowedValue(to));
    });
  };

  /**
   * A relation metadata value naming a record (for example the collection a
   * property value belongs to) must name one the write grant may reach.
   */
  const recordIdAllowed = async (value: unknown): Promise<boolean> => {
    if (isClearedValue(value)) return true;
    if (typeof value !== 'string') return false;
    const target = resourceNamedById(schema, value);
    return target !== undefined && (await targetAllowed(target, value));
  };

  /**
   * Foreign-key fields relate a record as `relations` do, so each one an
   * insert, merge or replace sets must point inside the write grant. Clearing
   * one is allowed: the record itself is checked as writable separately.
   */
  const recordRelationsAllowed = async (
    resource: string,
    record: Record<string, unknown>
  ): Promise<boolean> => {
    for (const fk of recordRelationFields(schema, resource)) {
      const kind = fk.resourceField === undefined ? undefined : record[fk.resourceField];
      if (!isClearedValue(kind) && !allowedValue(kind)) return false;
      const value = record[fk.field];
      if (isClearedValue(value)) continue;
      if (typeof value !== 'string') return false;
      const target = resolveTarget(fk.endpoint, value);
      if (typeof target !== 'string' || !(await targetAllowed(target, value))) return false;
      if (!isClearedValue(kind) && kind !== target) return false;
    }
    return true;
  };

  /**
   * DataFn applies every key of `relations` (and ignores `relation`), for
   * relation operations and for inserts or updates that carry relations, so
   * each named relation and each target record must sit inside the grant.
   */
  const relationsAllowed = async (
    mutation: Record<string, unknown>,
    resource: string,
    operation: string
  ): Promise<boolean> => {
    const relationOperation = RELATION_OPERATIONS.has(operation);
    if (!relationOperation && mutation.relations === undefined && mutation.relation === undefined) {
      return true;
    }
    if (!isRecord(mutation.relations)) return false;
    const relations = mutation.relations;
    const names = Object.keys(relations);
    if (relationOperation && names.length === 0) return false;
    if (mutation.relation !== undefined &&
      !(typeof mutation.relation === 'string' && names.includes(mutation.relation))) {
      return false;
    }
    for (const name of names) {
      const match = findRelationMatch(schema, resource, name);
      if (!match) return false;
      const endpoint = relationTargetEndpoint(match.relation, match.direction);
      const items = relationItems(relations[name]);
      if (!items) return false;
      const carriesTags = tagPolicy !== undefined &&
        'joinTable' in match.relation && match.relation.joinTable === tagPolicy.joinTable;
      const idFields = idMetadataFields(match.relation);
      const identityFields = identityMetadataFields(match.relation);
      for (const item of items) {
        if (identityFields.some((key) => key in item.metadata)) return false;
        const target = resolveTarget(endpoint, item.toId);
        if (typeof target !== 'string' || !(await targetAllowed(target, item.toId))) return false;
        for (const key of ['fromResource', 'toResource']) {
          if (key in item.metadata && !allowedValue(item.metadata[key])) return false;
        }
        for (const key of idFields) {
          if (!(await recordIdAllowed(item.metadata[key]))) return false;
        }
        if (carriesTags && !(await tagsUsable(item.metadata[tagPolicy.tagsField]))) return false;
      }
    }
    return true;
  };

  const canMutate = async (mutation: unknown): Promise<boolean> => {
    if (!isRecord(mutation) || typeof mutation.resource !== 'string' ||
      typeof mutation.operation !== 'string') {
      return false;
    }
    const resource = mutation.resource;
    const operation = mutation.operation;
    if (!tables.has(resource)) return false;
    if (mutation.record !== undefined && !isRecord(mutation.record)) return false;
    const record = isRecord(mutation.record) ? mutation.record : undefined;
    // DataFn writes the row named by record.id when it overrides mutation.id,
    // so the record may only repeat the id that is authorized below.
    if (record && 'id' in record && record.id !== mutation.id) return false;
    // The mutation id names the source record of every write, relations included,
    // so its id prefix may not name another resource.
    if (typeof mutation.id === 'string') {
      const named = resourceNamedById(schema, mutation.id);
      if (named !== undefined && named !== resource) return false;
    }
    if (!(await relationsAllowed(mutation, resource, operation))) return false;
    if (record && !(await recordRelationsAllowed(resource, record))) return false;
    const policy = ownership.shared.get(resource);
    if (!policy) return true;
    if (policy.kind === 'none') return false;
    const id = typeof mutation.id === 'string' ? mutation.id : undefined;
    if (!id) return false;
    if (policy.kind === 'field') {
      const field = policy.field;
      if (record && field in record && !fieldValueAllowed(policy, record[field])) return false;
      // An insert or replace writes the whole row, so it must set the field.
      if ((operation === 'insert' || operation === 'replace') && !(record && field in record)) {
        return false;
      }
      const existing = await shared.readRecord(resource, id);
      if (policy.recordField && !recordFieldBound(policy, record, existing, operation)) return false;
      const key = `${resource}|${id}`;
      const allowed = existing
        ? fieldValueAllowed(policy, existing[field])
        : operation === 'delete' || (record !== undefined && field in record) ||
          pendingOwned.has(key);
      // Every allowed non-delete write leaves the field inside the grant.
      if (allowed && operation !== 'delete') pendingOwned.add(key);
      if (operation === 'delete') pendingOwned.delete(key);
      return allowed;
    }
    if (isDerivedPolicy(policy)) {
      return (await derivedAccess(policy, [id], tables, 'write', shared)).has(id);
    }
    const field = policy.field;
    const writesItems = record !== undefined && field in record;
    if (operation === 'merge' && !writesItems) return true;
    const existing = await shared.readRecord(resource, id);
    return itemsWritable([
      ...(writesItems ? [record[field]] : []),
      ...(existing ? [existing[field]] : [])
    ]);
  };

  return { full: false, canQuery, canSearch, canMutate };
}

/**
 * Removes space items an app-scoped reader may not see. Kept items keep only
 * their visible children.
 */
function filterSpaceItems(
  items: unknown,
  visible: (item: Record<string, unknown>) => boolean
): unknown {
  if (isClearedList(items)) return items;
  // Items stored in an unexpected shape are withheld rather than passed through.
  if (!Array.isArray(items)) return [];
  const visit = (list: unknown[], depth: number): unknown[] => list.flatMap((item) => {
    if (depth > 32 || !isRecord(item) || !visible(item)) return [];
    return [Array.isArray(item.children)
      ? { ...item, children: visit(item.children, depth + 1) }
      : item];
  });
  return visit(items, 0);
}

/**
 * Filters a successful DataFn `query` or `transact` response body for an
 * app-scoped reader, using the request payload to find which results read a
 * shared resource: space items the grant may not see are removed, and view or
 * link tag rows the grant may not read are dropped. Returns the body
 * unchanged when nothing needed filtering.
 */
export async function filterScopedResponseBody(
  action: DataFnAction,
  payload: unknown,
  body: unknown,
  grant: AppGrant,
  store: AppScopeStore,
  schema: DatafnSchema,
  ownership: ResourceOwnership = resourceOwnership
): Promise<unknown> {
  if (grant === 'all' || !isRecord(body) || body.ok !== true) return body;
  const tables = grantTables(grant, ownership);
  const shared = createSharedVisibility(store);
  const policyFor = (query: unknown): SharedResourcePolicy | undefined =>
    isRecord(query) && typeof query.resource === 'string' && query.relation === undefined
      ? ownership.shared.get(query.resource)
      : undefined;
  const filterResults = async (results: unknown[], queries: unknown[]) => {
    const policies = results.map((_, index) => policyFor(queries[index]));
    // Every space item tree in the response is checked with one lookup per type.
    const itemLists = results.flatMap((result, index) => {
      const policy = policies[index];
      if (policy?.kind !== 'items' || !isRecord(result) || !Array.isArray(result.data)) return [];
      return result.data.map((row) => (isRecord(row) ? row[policy.field] : undefined));
    });
    const itemVisible = await resolveSpaceItemAccess({
      lists: itemLists, tables, mode: 'read', ownership, schema, shared
    });
    const filtered: unknown[] = [];
    for (const [index, result] of results.entries()) {
      filtered.push(await filterResult(result, policies[index], itemVisible));
    }
    return filtered;
  };
  const filterResult = async (
    result: unknown,
    policy: SharedResourcePolicy | undefined,
    itemVisible: (item: Record<string, unknown>) => boolean
  ) => {
    if (policy?.kind === 'items') {
      // Only rows carry items; other result shapes (such as counts) pass through.
      if (!isRecord(result) || !Array.isArray(result.data)) return result;
      const field = policy.field;
      // A page cursor copies its last row's sort fields; one holding the items
      // field would carry the unfiltered tree, so it is dropped.
      const cursorLeaks = isRecord(result.nextCursor) && field in result.nextCursor;
      return {
        ...result,
        data: result.data.map((row) =>
          isRecord(row) && field in row
            ? { ...row, [field]: filterSpaceItems(row[field], itemVisible) }
            : row
        ),
        ...(cursorLeaks ? { nextCursor: null } : {})
      };
    }
    if (!isDerivedPolicy(policy)) return result;
    // An unexpected result shape for a filtered resource is emptied, not passed through.
    if (!isRecord(result) || !Array.isArray(result.data)) return { data: [] };
    const rows = result.data.filter(
      (row): row is Record<string, unknown> => isRecord(row) && typeof row.id === 'string'
    );
    const visible = await derivedAccess(
      policy, rows.map((row) => row.id as string), tables, 'read', shared
    );
    const data = rows.filter((row) => visible.has(row.id as string));
    return { ...result, data, ...('nextCursor' in result ? { nextCursor: null } : {}) };
  };
  if (action === 'query') {
    if (Array.isArray(payload)) {
      if (!payload.some(policyFor)) return body;
      if (!Array.isArray(body.result)) return { ...body, result: [] };
      return { ...body, result: await filterResults(body.result, payload) };
    }
    if (!policyFor(payload)) return body;
    const [result] = await filterResults([body.result], [payload]);
    return { ...body, result };
  }
  if (action !== 'transact' || !isRecord(payload) || !Array.isArray(payload.steps)) return body;
  const queries = payload.steps.map((step) => (isRecord(step) ? step.query : undefined));
  if (!queries.some(policyFor)) return body;
  if (!isRecord(body.result) || !Array.isArray(body.result.results)) {
    return { ...body, result: { ...(isRecord(body.result) ? body.result : {}), results: [] } };
  }
  return {
    ...body,
    result: { ...body.result, results: await filterResults(body.result.results, queries) }
  };
}

function grantTables(
  grant: ReadonlySet<ScopedApp>,
  ownership: ResourceOwnership
): Set<string> {
  const tables = new Set<string>();
  for (const app of grant) {
    for (const name of ownership.tables[app]) tables.add(name);
  }
  return tables;
}

/** True when an item and every item below it are visible. */
function spaceItemVisible(
  item: unknown,
  visible: (item: Record<string, unknown>) => boolean,
  depth = 0
): boolean {
  if (depth > 32 || !isRecord(item) || !visible(item)) return false;
  if (item.children === undefined) return true;
  return Array.isArray(item.children) &&
    item.children.every((child) => spaceItemVisible(child, visible, depth + 1));
}

function isClearedList(items: unknown): boolean {
  return items === undefined || items === null;
}

function readsOtherNamespaces(metadata: unknown): boolean {
  if (metadata === undefined) return false;
  if (!isRecord(metadata)) return true;
  return (metadata.accessMode !== undefined && metadata.accessMode !== 'namespace') ||
    metadata.namespaceFilter !== undefined;
}

function constrainsField(filters: unknown, field: string, allowed: ReadonlySet<string>): boolean {
  if (!isRecord(filters)) return false;
  if (valueConstrained(filters[field], allowed)) return true;
  const conjunction = filters.$and ?? filters.and;
  return Array.isArray(conjunction) &&
    conjunction.some((entry) => constrainsField(entry, field, allowed));
}

function valueConstrained(value: unknown, allowed: ReadonlySet<string>): boolean {
  if (typeof value === 'string') return allowed.has(value);
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 1) return false;
  const [operator] = keys;
  const operand = value[operator];
  if (operator === 'eq' || operator === '$eq') {
    return typeof operand === 'string' && allowed.has(operand);
  }
  if (operator === 'in' || operator === '$in') {
    return Array.isArray(operand) && operand.length > 0 &&
      operand.every((entry) => typeof entry === 'string' && allowed.has(entry));
  }
  return false;
}

function filterReferences(filter: unknown, field: string, depth = 0): boolean {
  if (depth > 16) return true;
  if (Array.isArray(filter)) return filter.some((entry) => filterReferences(entry, field, depth + 1));
  if (!isRecord(filter)) return false;
  return Object.entries(filter).some(([key, value]) =>
    key.split('.')[0] === field || filterReferences(value, field, depth + 1)
  );
}

/**
 * True when a sort may order rows by `field` (or a path below it). Terms are
 * parsed as DataFn parses them (`field`, `-field`, `field:dir`, `{ field }`),
 * and a sort DataFn would not parse counts as referencing the field.
 */
function sortReferences(sort: unknown, field: string): boolean {
  if (sort === undefined || sort === null) return false;
  if (!Array.isArray(sort)) return true;
  return sort.some((term) => {
    try {
      return parseSortTerm(term).field.split('.')[0] === field;
    } catch {
      return true;
    }
  });
}

/**
 * True when a query projection returns each row's id: no or an empty
 * selection (DataFn's default fields), `*` or `id`.
 */
function selectKeepsId(select: unknown): boolean {
  return select === undefined || (Array.isArray(select) &&
    (select.length === 0 || select.includes('id') || select.includes('*')));
}

function asList(payload: unknown): unknown[] {
  return Array.isArray(payload) ? payload : [payload];
}

async function everyAsync<T>(
  items: readonly T[],
  predicate: (item: T) => boolean | Promise<boolean>
): Promise<boolean> {
  for (const item of items) {
    if (!(await predicate(item))) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
