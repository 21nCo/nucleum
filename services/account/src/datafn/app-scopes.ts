import {
  endpointList,
  findRelationMatch,
  relationTargetEndpoint,
  type DatafnSchema
} from '@datafn/core';
import type { DataFnAction } from '@datafn/server';
import { defineAuthFnScopes, hasScopes, type AuthFnSession } from 'authfn';
import {
  SCOPED_APPS,
  resourceOwnership,
  type ResourceOwnership,
  type ScopedApp
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

/** Loads a stored record in the caller's namespace, or `null` when absent. */
export type AppScopeRecordReader = (
  resource: string,
  id: string
) => Promise<Record<string, unknown> | null>;

/** Inputs for one `authorizeAppScopes` decision. */
export interface AuthorizeAppScopesInput {
  access: AppScopeAccess;
  action: DataFnAction;
  payload: unknown;
  schema: DatafnSchema;
  readRecord: AppScopeRecordReader;
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
 * reconcile). Unrecognized payload shapes are denied.
 */
export async function authorizeAppScopes(
  input: AuthorizeAppScopesInput
): Promise<boolean> {
  const ownership = input.ownership ?? resourceOwnership;
  const read = createScopeView(input.access.read, ownership, input.schema);
  const write = createScopeView(input.access.write, ownership, input.schema);
  const { payload } = input;
  switch (input.action) {
    case 'status':
      return true;
    case 'query':
      return asList(payload).every((query) => read.canQuery(query));
    case 'search':
      return read.canSearch(payload);
    case 'mutation':
      return everyAsync(asList(payload), (m) => write.canMutate(m, input.readRecord));
    case 'push':
      return isRecord(payload) && Array.isArray(payload.mutations) &&
        everyAsync(payload.mutations, (m) => write.canMutate(m, input.readRecord));
    case 'transact':
      return isRecord(payload) && Array.isArray(payload.steps) &&
        everyAsync(payload.steps, async (step) => {
          if (!isRecord(step)) return false;
          if ('query' in step && !('mutation' in step)) return read.canQuery(step.query);
          if ('mutation' in step && !('query' in step)) {
            return write.canMutate(step.mutation, input.readRecord);
          }
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

interface ScopeView {
  full: boolean;
  canQuery(query: unknown): boolean;
  canSearch(payload: unknown): boolean;
  canMutate(mutation: unknown, readRecord: AppScopeRecordReader): Promise<boolean>;
}

function createScopeView(
  grant: AppGrant,
  ownership: ResourceOwnership,
  schema: DatafnSchema
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

  const itemsVisible = (items: unknown) =>
    items === undefined || items === null ||
    (Array.isArray(items) && items.every((item) => spaceItemVisible(item, tables)));

  const canQuery = (query: unknown): boolean => {
    if (!isRecord(query) || typeof query.resource !== 'string') return false;
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
      return constrainsField(query.filters, policy.field, tables);
    }
    if (policy.kind === 'items') {
      return query.groupBy === undefined && query.aggregations === undefined &&
        query.having === undefined && !filterReferences(query.filters, policy.field) &&
        !sortReferences(query.sort, policy.field);
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

  const canMutate = async (
    mutation: unknown,
    readRecord: AppScopeRecordReader
  ): Promise<boolean> => {
    if (!isRecord(mutation) || typeof mutation.resource !== 'string' ||
      typeof mutation.operation !== 'string') {
      return false;
    }
    const resource = mutation.resource;
    const operation = mutation.operation;
    if (!tables.has(resource)) return false;
    const policy = ownership.shared.get(resource);
    const touchesRelations = RELATION_OPERATIONS.has(operation) || mutation.relations !== undefined;
    if (touchesRelations) {
      if (policy) return false;
      const names = RELATION_OPERATIONS.has(operation)
        ? [mutation.relation]
        : isRecord(mutation.relations) ? Object.keys(mutation.relations) : [undefined];
      if (!names.every((name) => typeof name === 'string' &&
        relationTargets(resource, name).length > 0 && pathAllowed(resource, [name]))) {
        return false;
      }
    }
    if (!policy) return true;
    if (policy.kind === 'none') return false;
    const record = isRecord(mutation.record) ? mutation.record : undefined;
    const id = typeof mutation.id === 'string' ? mutation.id : undefined;
    if (policy.kind === 'field') {
      const field = policy.field;
      if (record && field in record && !allowedValue(record[field])) return false;
      if (operation === 'insert' && !(record && field in record)) return false;
      if (!id) return false;
      const existing = await readRecord(resource, id);
      if (existing) return allowedValue(existing[field]);
      return operation === 'delete' || (record !== undefined && field in record);
    }
    const field = policy.field;
    if (record && field in record && !itemsVisible(record[field])) return false;
    if (operation === 'merge' && !(record && field in record)) return true;
    if (!id) return false;
    const existing = await readRecord(resource, id);
    return !existing || itemsVisible(existing[field]);
  };

  return { full: false, canQuery, canSearch, canMutate };
}

/**
 * Removes space items an app-scoped reader may not see: resource items whose
 * type is outside the grant, and anything of an unknown kind. Kept items keep
 * only their visible children; page links stay.
 */
export function filterSpaceItems(
  items: unknown,
  grant: AppGrant,
  ownership: ResourceOwnership = resourceOwnership
): unknown {
  if (grant === 'all' || !Array.isArray(items)) return items;
  const tables = grantTables(grant, ownership);
  const visit = (list: unknown[]): unknown[] => list.flatMap((item) => {
    if (!isRecord(item) || !spaceItemKindVisible(item, tables)) return [];
    return [Array.isArray(item.children) ? { ...item, children: visit(item.children) } : item];
  });
  return visit(items);
}

/**
 * Applies `filterSpaceItems` to every space record in a successful DataFn
 * `query` or `transact` response body, using the request payload to find
 * which results read the shared items policy resource. Returns the body
 * unchanged when nothing needed filtering.
 */
export function filterScopedResponseBody(
  action: DataFnAction,
  payload: unknown,
  body: unknown,
  grant: AppGrant,
  ownership: ResourceOwnership = resourceOwnership
): unknown {
  if (grant === 'all' || !isRecord(body) || body.ok !== true) return body;
  const itemsField = (query: unknown): string | null => {
    if (!isRecord(query) || typeof query.resource !== 'string') return null;
    const policy = ownership.shared.get(query.resource);
    return policy?.kind === 'items' ? policy.field : null;
  };
  const filterResult = (result: unknown, field: string | null): unknown => {
    if (!field || !isRecord(result) || !Array.isArray(result.data)) return result;
    return {
      ...result,
      data: result.data.map((row) =>
        isRecord(row) && field in row
          ? { ...row, [field]: filterSpaceItems(row[field], grant, ownership) }
          : row
      )
    };
  };
  if (action === 'query') {
    if (Array.isArray(payload)) {
      const fields = payload.map(itemsField);
      if (!Array.isArray(body.result) || fields.every((field) => field === null)) return body;
      const results = body.result;
      return {
        ...body,
        result: results.map((result, index) => filterResult(result, fields[index] ?? null))
      };
    }
    const field = itemsField(payload);
    return field ? { ...body, result: filterResult(body.result, field) } : body;
  }
  if (action !== 'transact' || !isRecord(payload) || !Array.isArray(payload.steps)) return body;
  const fields = payload.steps.map((step) => (isRecord(step) ? itemsField(step.query) : null));
  if (!isRecord(body.result) || !Array.isArray(body.result.results) ||
    fields.every((field) => field === null)) {
    return body;
  }
  return {
    ...body,
    result: {
      ...body.result,
      results: body.result.results.map((result, index) =>
        filterResult(result, fields[index] ?? null))
    }
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

function spaceItemKindVisible(
  item: Record<string, unknown>,
  tables: ReadonlySet<string>
): boolean {
  if (item.type === SPACE_ITEM_TYPES.page || item.type === SPACE_ITEM_TYPES.section) {
    return true;
  }
  return item.type === SPACE_ITEM_TYPES.resource &&
    typeof item.resourceType === 'string' && tables.has(item.resourceType);
}

function spaceItemVisible(item: unknown, tables: ReadonlySet<string>, depth = 0): boolean {
  if (depth > 32 || !isRecord(item) || !spaceItemKindVisible(item, tables)) return false;
  if (item.children === undefined) return true;
  return Array.isArray(item.children) &&
    item.children.every((child) => spaceItemVisible(child, tables, depth + 1));
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

function sortReferences(sort: unknown, field: string): boolean {
  const terms = Array.isArray(sort) ? sort : sort === undefined ? [] : [sort];
  return terms.some((term) =>
    typeof term !== 'string' || term.split(':')[0].split('.')[0] === field
  );
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
