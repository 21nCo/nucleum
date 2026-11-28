import { createRouter, type Route, type RouteContext, type Router } from '@superfunctions/http';
import { DatafnExecutorError, type DatafnExecutor, type SearchProvider } from '@datafn/server';
import { stripNullsForNonNullableFields, type DatafnResourceSchema } from '@datafn/core';
import { AuthFnError, type AuthFnSession } from 'authfn';
import type { ConditionalKVStoreAdapter } from '@superfunctions/db';
import { nucleumDatafnSchema } from '@nucleum/schema/datafn';
import {
  interfaceContract,
  interfaceResources,
  resolveInterfaceResources,
  resolveInterfaceSharedFilter,
  resolveInterfaceVisibleTypes,
  type InterfaceApp,
  type InterfaceExposedResource,
  type InterfaceResourceContract
} from '@nucleum/schema/interfaces';
import type { SyncContext, SyncServer } from '../datafn/server.js';
import {
  filterScopedResponseBody,
  resolveAppScopeAccess,
  type AppGrant,
  type AppScopeWhere
} from '../datafn/app-scopes.js';
import { resolveAccountUserNamespace } from '../datafn/namespace.js';
import { ApiProblem, parameterProblem, problemSchema, validationProblem } from './problem.js';
import {
  parseFilterValue,
  recordSchema,
  resolveApiField,
  resourceSegment,
  resourceTitle,
  validateWriteBody,
  writeSchema,
  type ApiField,
  type JsonSchema
} from './resources.js';

/** Reads one stored row of a namespace by id. */
export type StoredReader = (resource: string, id: string, namespace: string) => Promise<Row | null>;

/** Namespace-scoped reads through a write's database transaction. */
export interface StoredTransaction {
  read: StoredReader;
  /** The rows of a namespace that match every clause. */
  find(model: string, where: readonly AppScopeWhere[], namespace: string): Promise<Row[]>;
}

/** What a router needs to serve requests. Without it the router only describes the API. */
export interface InterfaceApiServices {
  authenticate(request: Request): Promise<AuthFnSession | null> | AuthFnSession | null;
  getSyncServer(): Promise<SyncServer>;
  regionId?: string;
  /**
   * Remembers which body each `Idempotency-Key` was first sent with, so the
   * same key with another body is refused. Without it a reused key with
   * another body still never replays: creates are refused and updates apply.
   */
  idempotencyStore?: ConditionalKVStoreAdapter;
  /**
   * The search provider the sync server indexes its mutations with, and the
   * region DataFn tags indexed records with (when it runs multi-region). A v1
   * write runs in one DataFn transact call, which does not index, so the API
   * indexes the record each write commits the same way.
   */
  getSearchIndex?(): { provider: Pick<SearchProvider, 'updateIndices'>; regionId?: string } | undefined;
  /**
   * Reads one stored row of a namespace by id from the sync database: a
   * single lookup bounded by the id, outside DataFn's rate limits. The API
   * reads the namespace's end-to-end encryption setting with it, which
   * app-scoped tokens may not read through DataFn, before a write starts.
   */
  readStored(resource: string, id: string, namespace: string): Promise<Row | null>;
  /**
   * Reads the stored rows of a namespace that match every clause, as
   * `readStored` reads one: the lookups that decide which of a space's
   * items an app-scoped token may see.
   */
  findStored: StoredTransaction['find'];
  /**
   * Runs `write`, one DataFn transact call, with `check` run inside its
   * database transaction after the mutation and before the commit. `check`
   * reads stored rows through that transaction, scoped as `readStored` is
   * outside it; a check that throws rolls the write back.
   */
  inWriteTransaction<T>(check: (transaction: StoredTransaction) => Promise<void>, write: () => Promise<T>): Promise<T>;
  /**
   * Records failures the API answers with a 500. It receives only a
   * failure's class, code and status, never its message, which can quote
   * stored content.
   */
  logError?(message: string, failure: FailureSummary): void;
}

/** What the API logs about a failure. */
export interface FailureSummary {
  name?: string;
  code?: string;
  status?: number;
}

export type Access = 'read' | 'write';
type Row = Record<string, unknown>;

interface Caller {
  executor: DatafnExecutor<SyncContext>;
  context: SyncContext;
  /** The account the token belongs to. */
  actorId: string;
  services: InterfaceApiServices;
}

interface QueryResult {
  data: Row[];
  nextCursor?: Row | null;
}

interface MutationResult {
  ok: boolean;
  affectedIds?: string[];
  errors?: { code?: string; message?: string; path?: string }[];
  deduped?: boolean;
}

interface SearchHit {
  resource: string;
  id: string;
  score: number;
  data?: Row;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;
const MAX_BODY_BYTES = 65_536;
const IDEMPOTENCY_KEY = /^[\x21-\x7e]{1,255}$/;
const IDEMPOTENCY_TTL_SECONDS = 86_400;
/** How long a key stays claimed by a write that never finishes (a lost process). */
const IDEMPOTENCY_PENDING_SECONDS = 60;
/**
 * DataFn query metadata that keeps archived records, and records under an
 * archived ancestor, in a read. Trashed records stay hidden.
 */
const INCLUDE_INACTIVE = { includeArchived: true, includeAncestorInactive: true } as const;
/** The DataFn KV row (`kv:` and the key) holding a namespace's end-to-end encryption settings. */
const E2EE_SETTINGS_ID = 'kv:nucleum:e2ee';

/**
 * Builds one app's versioned REST router: list, get, create and update for
 * each resource its interface contract exposes, and search. Requests go
 * through the DataFn executor as the caller's token narrowed to this app's
 * scopes, so DataFn's app-scope authorization filters shared resources.
 */
export function createInterfaceApiRouter(
  app: InterfaceApp,
  services?: InterfaceApiServices
): Router {
  const routes: Route[] = [];
  for (const contract of resolveInterfaceResources(app)) {
    routes.push(...resourceRoutes(app, contract, services));
  }
  routes.push(searchRoute(app, services));
  return createRouter({
    routes,
    maxBodyBytes: MAX_BODY_BYTES,
    onError: (error) => toProblem(error, services).toResponse()
  });
}

function resourceRoutes(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  services: InterfaceApiServices | undefined
): Route[] {
  const collectionPath = `${interfaceContract[app].restPath}/${resourceSegment(contract.resource)}`;
  const itemPath = `${collectionPath}/:id`;
  const name = resourceTitle(contract.resource);
  const shared = resolveInterfaceSharedFilter(app, contract.resource as InterfaceExposedResource);
  const paged = shared?.paged !== false;
  const record = recordSchema(contract);
  const tags = [resourceSegment(contract.resource)];
  const scope = (access: Access) =>
    `${interfaceContract[app].scopes[access]}${app === 'nucleum' ? '' : ' (or nucleum)'}`;
  const routes: Route[] = [
    {
      method: 'GET',
      path: collectionPath,
      handler: serve(app, 'read', services, (caller, ctx) => listRecords(app, contract, caller, ctx)),
      meta: {
        operationId: `list${resourceTitle(resourceSegment(contract.resource).replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase()))}`,
        summary: `List ${tags[0]}`,
        description: `${contract.description} Requires ${scope('read')}. ` + (paged
          ? 'Pages are ordered by `sort` and continue with `cursor`.'
          : 'Rows are filtered to this app after the query runs, so the list is not paged.') +
          inactiveListNote(contract),
        tags,
        query: listParameters(app, contract, paged),
        responses: {
          200: {
            description: 'The page of records.',
            schema: {
              title: `${name}Page`,
              type: 'object',
              required: ['data', 'nextCursor'],
              properties: {
                data: { type: 'array', items: record },
                nextCursor: { type: ['string', 'null'] }
              }
            }
          },
          ...errorResponses(400, 401, 403, 429)
        }
      }
    },
    {
      method: 'GET',
      path: itemPath,
      handler: serve(app, 'read', services, async (caller, ctx) =>
        Response.json(await getRecord(app, contract, caller, ctx.params.id))),
      meta: {
        operationId: `get${name}`,
        summary: `Get one ${contract.resource}`,
        description: `Requires ${scope('read')}.`,
        tags,
        responses: { 200: { description: 'The record.', schema: record }, ...errorResponses(400, 401, 403, 404, 429) }
      }
    }
  ];
  if (contract.create) {
    routes.push({
      method: 'POST',
      path: collectionPath,
      handler: serve(app, 'write', services, (caller, ctx, request) =>
        createRecord(app, contract, caller, ctx, request, collectionPath)),
      meta: {
        operationId: `create${name}`,
        summary: `Create a ${contract.resource}`,
        description: `Requires ${scope('write')}. ${idempotencyNote}`,
        tags,
        headers: idempotencyHeader,
        body: writeSchema(contract, 'create', sharedFieldConstraint(app, contract)),
        responses: {
          201: {
            description: 'The created record.',
            schema: record,
            headers: { Location: locationHeader, 'Idempotent-Replayed': replayedHeader }
          },
          ...errorResponses(400, 401, 403, 405, 409, 413, 422, 429)
        }
      }
    });
  }
  if (contract.update) {
    routes.push({
      method: 'PATCH',
      path: itemPath,
      handler: serve(app, 'write', services, (caller, ctx, request) =>
        updateRecord(app, contract, caller, ctx, request)),
      meta: {
        operationId: `update${name}`,
        summary: `Update a ${contract.resource}`,
        description: `Sets only the fields in the body. Requires ${scope('write')}. ${updateRaceNote} ${idempotencyNote}`,
        tags,
        headers: idempotencyHeader,
        body: writeSchema(contract, 'update'),
        responses: {
          200: { description: 'The updated record.', schema: record, headers: { 'Idempotent-Replayed': replayedHeader } },
          ...errorResponses(400, 401, 403, 404, 405, 409, 413, 422, 429)
        }
      }
    });
  }
  return routes;
}

/** How a list treats archived records, for resources that can be archived. */
function inactiveListNote(contract: InterfaceResourceContract): string {
  if (!contract.filters.includes('isArchived')) return '';
  const archived = ' Archived records are left out unless `isArchived=true` is given, which lists the records that are archived themselves.';
  if (!inheritsInactive(contract.resource)) return archived;
  return `${archived} A record under an archived parent that is not archived itself is left out of every list; read it by id.`;
}

/** Whether a resource's records turn inactive with an archived ancestor. */
function inheritsInactive(resource: string): boolean {
  const relations = nucleumDatafnSchema.relations as readonly RelationDeclaration[] | undefined;
  return (relations ?? []).some((relation) => relation.inheritsInactive === true &&
    endpoints(relation.type === 'many-one' ? relation.from : relation.to).includes(resource));
}

interface RelationDeclaration {
  from: string | readonly string[];
  to: string | readonly string[];
  type: string;
  fkField?: string;
  inheritsInactive?: boolean;
}

function endpoints(endpoint: string | readonly string[]): readonly string[] {
  return typeof endpoint === 'string' ? [endpoint] : endpoint;
}

const idempotencyNote =
  'Repeating the request with the same `Idempotency-Key` and body does not write again: it answers with the ' +
  'record\'s current state and `Idempotent-Replayed: true`. A key belongs to the token\'s account, this operation ' +
  'and the record it targets, and is remembered for 24 hours (a create key keeps naming the record it created). ' +
  'Sending it again with another body gets a 422 problem with code `idempotency_key_reused`; an update sent ' +
  'again while the first is still being processed gets a 409 problem with code `idempotency_in_progress` and ' +
  '`Retry-After`.';

const updateRaceNote =
  'The update applies only while the record still exists, is not trashed and is visible to this token: if it is ' +
  'deleted, trashed or hidden before the write lands, the request gets a 404 problem and nothing changes. If a ' +
  'reference field the body leaves out changes before the write lands, the request gets a 409 problem with code ' +
  '`conflict` and nothing changes.';

const locationHeader = { type: 'string', description: 'Path of the created record.' };

const replayedHeader = {
  type: 'string',
  enum: ['true'],
  description: 'Present when the response replays an earlier request with the same Idempotency-Key.'
};

const idempotencyHeader = {
  'Idempotency-Key': {
    type: 'string',
    minLength: 1,
    maxLength: 255,
    description: 'Client-chosen key that makes retries of this write safe.'
  }
};

function listParameters(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  paged: boolean
): Record<string, JsonSchema> {
  const sorts = contract.sorts.flatMap((field) => [field, `-${field}`]);
  const visible = sharedFieldConstraint(app, contract);
  return {
    ...Object.fromEntries(contract.filters.map((name) => {
      const field = resolveApiField(contract.resource, name);
      const schema: JsonSchema = { type: field.kind === 'integer' ? 'integer' : field.kind };
      if (field.enum) schema.enum = [...field.enum];
      if (visible && name === 'resource') schema.enum = visible;
      return [name, { ...schema, description: `Only records whose ${name} equals this value.` }];
    })),
    sort: { type: 'string', enum: sorts, default: '-createdAt', description: 'Sort field; a leading `-` sorts descending.' },
    ...(paged
      ? {
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT },
          cursor: { type: 'string', description: 'The `nextCursor` of the previous page, with the same `sort`.' }
        }
      : {})
  };
}

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: '400 invalid parameter, cursor, path or header',
  401: '401 missing, invalid, expired or revoked personal access token, or a session token (with WWW-Authenticate)',
  403: '403 token lacks the scope or may not reach the record',
  404: '404 no visible record with that id',
  405: '405 method not served for this path (with Allow)',
  409: '409 the record an Idempotency-Key created is no longer visible, a request with that key is still in progress (with Retry-After), the record changed while an update ran, or the account uses end-to-end encryption (end_to_end_encrypted)',
  413: '413 body larger than 64 KiB',
  422: '422 invalid body, a reference to a record that does not exist or is not visible, or an Idempotency-Key reused with another body',
  429: '429 rate limited'
};

/**
 * The `4XX` and `5XX` problem responses, listing the client statuses an
 * operation answers with. The service sends them as application/problem+json.
 */
function errorResponses(...statuses: number[]): Record<string, { description: string; schema: JsonSchema }> {
  const schema = problemSchema as unknown as JsonSchema;
  return {
    '4XX': {
      description: `Problem details (application/problem+json): ${statuses.map((status) => ERROR_DESCRIPTIONS[status]).join('; ')}.`,
      schema
    },
    '5XX': {
      description: 'Problem details (application/problem+json): 500 internal error; 503 service unavailable.',
      schema
    }
  };
}

function searchRoute(app: InterfaceApp, services: InterfaceApiServices | undefined): Route {
  const searchable = searchableResources(app);
  return {
    method: 'GET',
    path: `${interfaceContract[app].restPath}/search`,
    handler: serve(app, 'read', services, (caller, ctx) => search(searchable, caller, ctx)),
    meta: {
      operationId: 'search',
      summary: 'Search records',
      description: `Full-text search over ${searchable.join(', ')}. Requires ${interfaceContract[app].scopes.read}${app === 'nucleum' ? '' : ' (or nucleum)'}.`,
      tags: ['search'],
      query: {
        q: { type: 'string', minLength: 1, maxLength: 256, description: 'Search text (required).' },
        resource: { type: 'string', enum: searchable, description: 'Search only this resource.' },
        limit: { type: 'integer', minimum: 1, maximum: MAX_SEARCH_LIMIT, default: DEFAULT_SEARCH_LIMIT }
      },
      responses: {
        200: {
          description: 'Matches, best first.',
          schema: {
            title: 'SearchResults',
            type: 'object',
            required: ['data'],
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['resource', 'id', 'score', 'record'],
                  properties: {
                    resource: { type: 'string', enum: searchable },
                    id: { type: 'string' },
                    score: { type: 'number' },
                    record: { type: 'object' }
                  }
                }
              }
            }
          }
        },
        ...errorResponses(400, 401, 403, 429)
      }
    }
  };
}

/**
 * Resources an app searches: those with search indices that its tokens reach
 * without a shared filter (DataFn search cannot filter shared rows), or every
 * indexed one for `nucleum`.
 */
export function searchableResources(app: InterfaceApp): string[] {
  return interfaceContract[app].resources.filter((resource) => {
    const indices = nucleumDatafnSchema.resources.find((entry) => entry.name === resource)
      ?.indices as { search?: readonly string[] } | undefined;
    return (indices?.search?.length ?? 0) > 0 && resolveInterfaceSharedFilter(app, resource) === null;
  });
}

type Handler = (caller: Caller, ctx: RouteContext, request: Request) => Promise<Response>;

function serve(
  app: InterfaceApp,
  access: Access,
  services: InterfaceApiServices | undefined,
  handler: Handler
) {
  return async (request: Request, ctx: RouteContext): Promise<Response> => {
    try {
      return await handler(await resolveCaller(app, access, request, services), ctx, request);
    } catch (error) {
      return toProblem(error, services).toResponse();
    }
  };
}

function grantCovers(grant: AppGrant, app: InterfaceApp): boolean {
  return grant === 'all' || (app !== 'nucleum' && grant.has(app));
}

/** A personal access token that holds an app's scope, as `authenticateAppToken` accepts it. */
export interface AppToken {
  session: AuthFnSession;
  /** The request authfn saw: the caller's headers without cookies. */
  tokenRequest: Request;
  /** The app's scopes the token holds: its read scope, and its write scope when granted. */
  scopes: string[];
}

/**
 * Authenticates the bearer token alone (cookies are dropped, so a browser
 * session never authorizes a call), accepts only a personal access token and
 * checks it holds this app's scope for the access. Throws the API's 401 or
 * 403 problem otherwise; any other failure is left to `toProblem`.
 */
export async function authenticateAppToken(
  app: InterfaceApp,
  access: Access,
  request: Request,
  services: Pick<InterfaceApiServices, 'authenticate'>
): Promise<AppToken> {
  const challenge = { 'www-authenticate': `Bearer realm="${app}"` };
  if (!/^bearer\s+\S+$/i.test(request.headers.get('authorization')?.trim() ?? '')) {
    throw new ApiProblem(401, 'unauthenticated', 'Send a personal access token as a Bearer token.', {}, challenge);
  }
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  const tokenRequest = new Request(request.url, { method: request.method, headers });
  let session: AuthFnSession | null;
  try {
    session = await services.authenticate(tokenRequest);
  } catch (error) {
    if (error instanceof AuthFnError && error.status === 401) {
      throw new ApiProblem(401, 'unauthenticated', error.message, {}, challenge);
    }
    throw error;
  }
  if (!session || session.actorType !== 'user') {
    throw new ApiProblem(401, 'unauthenticated', 'The token is not valid.', {}, challenge);
  }
  // Only a personal access token (a user's API key) may call; an interactive
  // session token carries every scope and is meant for the apps themselves.
  if (session.type !== 'api-key') {
    throw new ApiProblem(401, 'unauthenticated', 'Send a personal access token, not a session token.', {}, challenge);
  }
  const grants = resolveAppScopeAccess(session);
  const scopes = interfaceContract[app].scopes;
  const needed = access === 'read' ? [scopes.read] : [scopes.read, scopes.write];
  if (!grantCovers(grants.read, app) || (access === 'write' && !grantCovers(grants.write, app))) {
    throw new ApiProblem(403, 'insufficient_scope', `This token needs ${needed.join(' and ')}.`, { scopes: needed }, {
      'www-authenticate': `Bearer realm="${app}", error="insufficient_scope", scope="${needed.join(' ')}"`
    });
  }
  return {
    session,
    tokenRequest,
    scopes: grantCovers(grants.write, app) ? [scopes.read, scopes.write] : [scopes.read]
  };
}

/** Authenticates the caller as `authenticateAppToken` does and narrows its session to this app's scopes for DataFn. */
async function resolveCaller(
  app: InterfaceApp,
  access: Access,
  request: Request,
  services: InterfaceApiServices | undefined
): Promise<Caller> {
  if (!services) {
    throw new ApiProblem(503, 'unavailable', 'This router only describes the API.');
  }
  const { session, tokenRequest, scopes } = await authenticateAppToken(app, access, request, services);
  const narrowed = { ...session, scopes };
  const server = await services.getSyncServer();
  return {
    executor: server.executor,
    context: { request: tokenRequest, session: narrowed, publicLink: null, regionId: services.regionId },
    actorId: session.actorId,
    services
  };
}

/** For an app-scoped token, the filter that keeps a `field`-shared resource to the app's types. */
function sharedFieldConstraint(app: InterfaceApp, contract: InterfaceResourceContract): string[] | null {
  const shared = resolveInterfaceSharedFilter(app, contract.resource as InterfaceExposedResource);
  if (shared?.kind !== 'field') return null;
  const visible = resolveInterfaceVisibleTypes(app);
  return visible === 'all' ? null : [...visible];
}

async function listRecords(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  ctx: RouteContext
): Promise<Response> {
  const paged = resolveInterfaceSharedFilter(app, contract.resource as InterfaceExposedResource)?.paged !== false;
  const params = ctx.query;
  const known = new Set<string>([...contract.filters, 'sort', ...(paged ? ['limit', 'cursor'] : [])]);
  for (const name of new Set(params.keys())) {
    if (!known.has(name)) throw parameterProblem(name, `Unknown query parameter ${name}.`);
    if (params.getAll(name).length > 1) throw parameterProblem(name, `${name} may be given once.`);
  }
  const filters: Row = {};
  for (const name of contract.filters) {
    const raw = params.get(name);
    if (raw === null) continue;
    const value = parseFilterValue(resolveApiField(contract.resource, name), raw);
    if (value === undefined) throw parameterProblem(name, `${name} has an invalid value.`);
    filters[name] = value;
  }
  const visible = sharedFieldConstraint(app, contract);
  if (visible) {
    const requested = filters.resource;
    if (requested !== undefined && !visible.includes(String(requested))) {
      throw parameterProblem('resource', `resource must be one of ${visible.join(', ')}.`);
    }
    filters.resource = requested ?? { in: visible };
  }
  const sort = params.get('sort') ?? '-createdAt';
  if (!contract.sorts.includes(sort.replace(/^-/, ''))) {
    throw parameterProblem('sort', `sort must be one of ${contract.sorts.join(', ')}, optionally prefixed with -.`);
  }
  // DataFn leaves archived records out of every read unless asked; a list
  // filtered on isArchived=true asks for exactly those.
  const metadata = filters.isArchived === true ? INCLUDE_INACTIVE : undefined;
  if (!paged) {
    const result = await run<QueryResult>(() => caller.executor.query({
      resource: contract.resource,
      version: 1,
      filters,
      sort: [sort, 'id'],
      ...(metadata ? { metadata } : {})
    }, caller.context), 'read', caller.services);
    return Response.json({ data: result.data.map((row) => project(contract, row)), nextCursor: null });
  }
  const limit = parseLimit(params.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const raw = params.get('cursor');
  const sortField = resolveApiField(contract.resource, sort.replace(/^-/, ''));
  const cursor = raw === null ? null : decodeCursor(raw, sort, sortField);
  const required = filters[sortField.name];
  if (cursor && cursor.value !== null && required !== undefined && !isOperatorSet(required) &&
    canonicalJson(required) !== canonicalJson(cursor.value)) {
    throw parameterProblem('cursor', `cursor does not match the ${sortField.name} filter of this list.`);
  }
  // One row past the page shows whether another follows; DataFn reads at
  // most MAX_LIMIT rows a query, so a full-size page probes for it instead.
  const rows = await keysetPage(contract, caller, { filters, metadata }, sort, cursor, Math.min(limit + 1, MAX_LIMIT));
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const after = last ? { sort, value: sortValue(last, sortField), id: String(last.id) } : null;
  const more = rows.length > limit || (after !== null && rows.length === MAX_LIMIT &&
    (await keysetPage(contract, caller, { filters, metadata }, sort, after, 1)).length > 0);
  return Response.json({
    data: page.map((row) => project(contract, row)),
    nextCursor: more && after ? encodeCursor(after) : null
  });
}

interface Cursor {
  sort: string;
  /** The last row's sort field value; null once the page reached rows without one. */
  value: string | number | boolean | null;
  id: string;
}

function sortValue(row: Row, field: ApiField): Cursor['value'] {
  const value = serializeField(field, row[field.name]);
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;
}

/** The cursor value as the sort field's kind, or `undefined` when it is not one. */
function cursorValue(field: ApiField, value: unknown): Cursor['value'] | undefined {
  if (value === null) return null;
  if (field.kind === 'number' || field.kind === 'integer') {
    const number = serializeField(field, value);
    if (typeof number !== 'number') return undefined;
    // Integer fields are bigint columns, which compare only with whole numbers.
    const valid = field.kind === 'integer' ? Number.isSafeInteger(number) : Number.isFinite(number);
    return valid ? number : undefined;
  }
  if (field.kind === 'string') return typeof value === 'string' ? value : undefined;
  if (field.kind === 'boolean') return typeof value === 'boolean' ? value : undefined;
  return undefined;
}

function isOperatorSet(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads up to `want` rows after the cursor: rows with a value for the sort
 * field first, in sort order with `id` breaking ties, then rows without one
 * by `id`. Each segment is a filtered query the database orders and limits,
 * so a page never depends on where an adapter sorts nulls or on DataFn
 * comparing values outside the database.
 */
async function keysetPage(
  contract: InterfaceResourceContract,
  caller: Caller,
  { filters, metadata }: { filters: Row; metadata?: Row },
  sort: string,
  cursor: Cursor | null,
  want: number
): Promise<Row[]> {
  const field = sort.replace(/^-/, '');
  const segments: { where: Record<string, Row>; sort: string[] }[] = [];
  if (cursor === null) {
    segments.push({ where: { [field]: { is_not_null: true } }, sort: [sort, 'id'] });
  } else if (cursor.value !== null) {
    segments.push({ where: { [field]: { eq: cursor.value }, id: { gt: cursor.id } }, sort: ['id'] });
    segments.push({
      where: { [field]: { [sort.startsWith('-') ? 'lt' : 'gt']: cursor.value, is_not_null: true } },
      sort: [sort, 'id']
    });
  }
  if (field !== 'id') {
    segments.push({
      where: { [field]: { is_null: true }, ...(cursor?.value === null ? { id: { gt: cursor.id } } : {}) },
      sort: ['id']
    });
  }
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const segment of segments) {
    if (rows.length >= want) break;
    const segmentFilters = withConditions(filters, segment.where);
    if (segmentFilters === null) continue;
    // A row whose sort value changed after an earlier segment read it can
    // come back here; only rows this page holds can repeat, so reading
    // `want` rows still leaves enough new ones.
    const result = await run<QueryResult>(() => caller.executor.query({
      resource: contract.resource,
      version: 1,
      filters: segmentFilters,
      sort: segment.sort,
      limit: want,
      ...(metadata ? { metadata } : {})
    }, caller.context), 'read', caller.services);
    for (const row of result.data) {
      const id = String(row.id);
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(row);
      if (rows.length >= want) break;
    }
  }
  return rows;
}

/**
 * Adds operator conditions to the caller's filters, keeping both. Returns
 * null when one operator would need two different values, which no row meets.
 */
function withConditions(filters: Row, conditions: Record<string, Row>): Row | null {
  const merged: Row = { ...filters };
  for (const [name, ops] of Object.entries(conditions)) {
    const existing = merged[name];
    const combined: Row = isOperatorSet(existing) ? { ...existing } : existing === undefined ? {} : { eq: existing };
    for (const [op, operand] of Object.entries(ops)) {
      if (op in combined && canonicalJson(combined[op]) !== canonicalJson(operand)) return null;
      combined[op] = operand;
    }
    merged[name] = combined;
  }
  return merged;
}

/**
 * Reads one record by id, whether or not it or an ancestor is archived (a
 * write's readback and replay must find what it wrote). Trashed records and
 * records this app's token may not see read as missing.
 */
async function getRecord(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  id: string
): Promise<Row> {
  const row = await findRecord(app, contract.resource, caller, id);
  if (!row) throw notVisible(contract, id);
  return project(contract, row);
}

async function findRecord(app: InterfaceApp, resource: string, caller: Caller, id: string): Promise<Row | null> {
  if (!id.startsWith(`${resourceIdPrefix(resource)}:`)) return null;
  const result = await run<QueryResult>(() => caller.executor.query(recordQuery(app, resource, id), caller.context),
    'read', caller.services);
  return result.data.find((entry) => entry.id === id) ?? null;
}

/** The DataFn query reading one record by id the way `findRecord` does. */
function recordQuery(app: InterfaceApp, resource: string, id: string): Row {
  const filters: Row = { id: { eq: id } };
  const shared = resolveInterfaceSharedFilter(app, resource as InterfaceExposedResource);
  const visible = resolveInterfaceVisibleTypes(app);
  if (shared?.kind === 'field' && visible !== 'all') filters.resource = { in: [...visible] };
  return {
    resource,
    version: 1,
    filters,
    metadata: INCLUDE_INACTIVE,
    ...(shared?.paged !== false ? { limit: 1 } : {})
  };
}

/**
 * The condition DataFn checks on the stored row inside an update's write: the
 * row must still exist (DataFn fails a guard on a missing row), must not be
 * trashed, and must still hold a type this app may see. A delete, trash or
 * change of type that lands after the existence check fails the guard, so
 * the merge neither recreates nor changes the row. The reference fields the
 * body leaves alone must still hold the values read before, because DataFn's
 * readback omits them and the answer takes them from that read.
 */
function updateGuard(app: InterfaceApp, contract: InterfaceResourceContract, before: Row, body: Row): Row {
  const resource = contract.resource;
  const guard: Row = {};
  if (hasCapability(resource, 'trash')) guard.trashedAt = { is_null: true };
  const shared = resolveInterfaceSharedFilter(app, resource as InterfaceExposedResource);
  const visible = resolveInterfaceVisibleTypes(app);
  if (shared?.kind === 'field' && visible !== 'all') guard.resource = { in: [...visible] };
  for (const name of referenceFields(contract)) {
    if (name in body) continue;
    guard[name] = before[name] === undefined || before[name] === null ? { is_null: true } : { eq: before[name] };
  }
  return guard;
}

/** The contract's many-one reference fields, which DataFn leaves out of a transact read. */
function referenceFields(contract: InterfaceResourceContract): string[] {
  return contract.fields.filter((name) => referenceTarget(contract.resource, name) !== null);
}

function hasCapability(resource: string, capability: string): boolean {
  const schema = nucleumDatafnSchema as { capabilities?: readonly unknown[] };
  const declared = nucleumDatafnSchema.resources.find((entry) => entry.name === resource) as
    { capabilities?: readonly unknown[] } | undefined;
  return [...(schema.capabilities ?? []), ...(declared?.capabilities ?? [])].includes(capability);
}

/** The resource a many-one reference field names, such as a task's `objectiveId`. */
function referenceTarget(resource: string, name: string): string | null {
  const relations = nucleumDatafnSchema.relations as readonly RelationDeclaration[] | undefined;
  const relation = (relations ?? []).find((entry) => entry.type === 'many-one' && entry.fkField === name &&
    typeof entry.from === 'string' && entry.from === resource && typeof entry.to === 'string');
  return relation ? relation.to as string : null;
}

/**
 * Refuses a write whose reference fields name a record that does not exist
 * or that this token cannot see: storage without foreign keys would keep a
 * dangling reference and PostgreSQL would fail the write.
 */
async function checkReferences(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  body: Row
): Promise<void> {
  const errors: { pointer: string; detail: string }[] = [];
  for (const [name, value] of Object.entries(body)) {
    const target = typeof value === 'string' ? referenceTarget(contract.resource, name) : null;
    if (!target) continue;
    let found: Row | null;
    try {
      found = await findRecord(app, target, caller, value as string);
    } catch (error) {
      if (!(error instanceof ApiProblem) || (error.status !== 403 && error.status !== 404)) throw error;
      found = null;
    }
    if (!found) errors.push({ pointer: `/${name}`, detail: `${name} names no ${target} visible to this token.` });
  }
  if (errors.length > 0) throw validationProblem(errors);
}

/**
 * Runs a write's mutation after checking its references. When the mutation
 * fails for another reason than an id conflict or a failed update guard, its
 * references are checked again, so a referenced record removed meanwhile (a
 * database foreign-key failure) answers 422 rather than 500.
 */
async function mutateChecked(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  body: Row,
  payload: Row
): Promise<Written> {
  await checkReferences(app, contract, caller, body);
  let written: Written;
  try {
    written = await mutate(app, caller, payload);
  } catch (error) {
    if (error instanceof ApiProblem && error.status >= 500) await checkReferences(app, contract, caller, body);
    throw error;
  }
  const { result } = written;
  if (!result.ok && !isIdConflict(result) && !isGuardFailure(result)) {
    await checkReferences(app, contract, caller, body);
  }
  return written;
}

async function createRecord(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  ctx: RouteContext,
  request: Request,
  collectionPath: string
): Promise<Response> {
  const body = validateWriteBody(contract, 'create', await readBody(ctx));
  const visible = sharedFieldConstraint(app, contract);
  if (visible && !visible.includes(String(body.resource))) {
    throw validationProblem([{ pointer: '/resource', detail: `resource must be one of ${visible.join(', ')}.` }]);
  }
  const keyed = await idempotency(app, request, caller, body, ['create', contract.resource]);
  // A keyed create derives its id from the key, so a retry that misses
  // DataFn's replay record (overlapping or interrupted) meets the first row.
  const id = keyed.enabled
    ? keyedId(contract.resource, keyed.key)
    : `${resourceIdPrefix(contract.resource)}:${crypto.randomUUID()}`;
  const respond = (record: Row, replayed: boolean) => Response.json(record, {
    status: 201,
    headers: {
      location: `${collectionPath}/${encodeURIComponent(id)}`,
      ...(replayed ? { 'idempotent-replayed': 'true' } : {})
    }
  });
  if (keyed.state === 'done') return respond(await keyedRecord(app, contract, caller, id), true);
  // A create still in progress under this key needs no wait: its id is
  // taken, so this insert either replays it or fails the body match.
  return keyed.write(async (committed) => {
    // After a finished key replays, and before anything is stored.
    await refuseEncrypted(caller);
    const record = { ...body };
    applyDerivedFields(contract, record);
    const { result, row } = await mutateChecked(app, contract, caller, body, {
      resource: contract.resource,
      version: 1,
      operation: 'insert',
      id,
      record,
      ...keyed.mutation
    });
    if (result.ok) {
      await committed();
      // A replayed create whose record is gone meanwhile has nothing to answer with.
      if (row === null) throw result.deduped === true ? idempotencyConflict() : notVisible(contract, id);
      await indexWritten(caller, contract.resource, row);
      return respond(project(contract, await withScopedItems(app, caller, contract.resource, row)), result.deduped === true);
    }
    if (!keyed.enabled || !isIdConflict(result)) throw mutationProblem(result, caller);
    const stored = await matchKeyedRecord(app, contract, caller, id, body);
    await committed();
    return respond(stored, true);
  });
}

async function updateRecord(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  ctx: RouteContext,
  request: Request
): Promise<Response> {
  const body = validateWriteBody(contract, 'update', await readBody(ctx));
  const id = ctx.params.id;
  const before = await getRecord(app, contract, caller, id);
  const keyed = await idempotency(app, request, caller, body, ['update', contract.resource, id]);
  const respond = (record: Row, replayed: boolean) => Response.json(record, {
    headers: replayed ? { 'idempotent-replayed': 'true' } : {}
  });
  if (keyed.state === 'done') return respond(await getRecord(app, contract, caller, id), true);
  // Two overlapping updates would each derive fields such as a completion
  // time, so the later one waits for the first instead of writing.
  if (keyed.state === 'in_progress') throw idempotencyInProgress();
  return keyed.write(async (committed) => {
    // After a finished key replays, and before anything is stored.
    await refuseEncrypted(caller);
    const record = { ...body };
    applyDerivedFields(contract, record);
    let written: Written;
    try {
      written = await mutateChecked(app, contract, caller, body, {
        resource: contract.resource,
        version: 1,
        operation: 'merge',
        id,
        record,
        // DataFn checks this on the stored row inside the write, so an update
        // never recreates or changes a row deleted, trashed or hidden since
        // the existence check above.
        if: updateGuard(app, contract, before, body),
        ...keyed.mutation
      });
    } catch (error) {
      // App-scope authorization in the same DataFn call refuses a record whose
      // type left this app's view after the existence check: that is a record
      // this token no longer sees.
      if (error instanceof ApiProblem && error.status === 403 &&
        !await findRecord(app, contract.resource, caller, id)) throw notVisible(contract, id);
      throw error;
    }
    const { result, row } = written;
    if (!result.ok) {
      if (!isGuardFailure(result)) throw mutationProblem(result, caller);
      // Nothing was written. A record gone or hidden answers 404; one whose
      // unchanged reference moved meanwhile answers 409 so the caller retries.
      if (!await findRecord(app, contract.resource, caller, id)) throw notVisible(contract, id);
      throw new ApiProblem(409, 'conflict', `The ${contract.resource} changed while this update ran; retry it.`);
    }
    await committed();
    // The row left this token's view in the same transaction: nothing to answer with or index.
    if (row === null) throw notVisible(contract, id);
    await indexWritten(caller, contract.resource, row);
    return respond(project(contract, await withScopedItems(app, caller, contract.resource, row)), result.deduped === true);
  });
}

/** Reads the record a finished keyed create wrote. */
async function keyedRecord(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  id: string
): Promise<Row> {
  try {
    return await getRecord(app, contract, caller, id);
  } catch (error) {
    if (error instanceof ApiProblem && error.status === 404) throw idempotencyConflict();
    throw error;
  }
}

/**
 * A keyed create whose id already exists replays only when the stored record
 * still holds every field of this body; otherwise the key was used for
 * another body.
 */
async function matchKeyedRecord(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  id: string,
  body: Row
): Promise<Row> {
  const stored = await keyedRecord(app, contract, caller, id);
  const matches = Object.entries(body).every(([name, value]) =>
    canonicalJson(stored[name] ?? null) === canonicalJson(serializeField(resolveApiField(contract.resource, name), value)));
  if (!matches) throw idempotencyKeyReused();
  return stored;
}

function isIdConflict(result: MutationResult): boolean {
  return result.errors?.some((error) => error.code === 'CONFLICT' && (error.path === undefined || error.path === 'id')) === true;
}

/** DataFn reports an update guard the stored row no longer meets as a conflict on `if`. */
function isGuardFailure(result: MutationResult): boolean {
  return result.errors?.some((error) => error.code === 'CONFLICT' && error.path === 'if') === true;
}

/**
 * Refuses a write to an account with end-to-end encryption on. Its apps
 * encrypt record content before it reaches the server, so a plaintext v1
 * write would replace encrypted content and reach the search index. The
 * check reads the namespace's encryption setting before anything is stored.
 */
async function refuseEncrypted(caller: Caller): Promise<void> {
  const settings = await caller.services.readStored('kv', E2EE_SETTINGS_ID, resolveAccountUserNamespace(caller.actorId));
  if (encryptionEnabled(settings)) throw encryptedProblem();
}

function encryptedProblem(): ApiProblem {
  return new ApiProblem(409, 'end_to_end_encrypted',
    'This account uses end-to-end encryption, and v1 writes cannot encrypt content yet.');
}

/** Whether a stored end-to-end encryption settings row turns encryption on. */
function encryptionEnabled(stored: Row | null): boolean {
  let settings = stored?.value;
  if (typeof settings === 'string') {
    try {
      settings = JSON.parse(settings);
    } catch {
      settings = null;
    }
  }
  return typeof settings === 'object' && settings !== null && (settings as { enabled?: unknown }).enabled === true;
}

export function notVisible(contract: InterfaceResourceContract, id: string): ApiProblem {
  return new ApiProblem(404, 'not_found', `No ${contract.resource} ${id} is visible to this token.`);
}

/** A write's outcome and the record it stored, read back in its transaction. */
interface Written {
  result: MutationResult;
  /** Null when the write failed or the stored record is not visible to this token. */
  row: Row | null;
}

interface TransactResult {
  ok?: boolean;
  results?: unknown[];
}

/**
 * Thrown inside a write's transaction to roll it back. Its message quotes
 * nothing stored, and it never reads as an unsupported feature, which would
 * make DataFn retry the write outside the transaction.
 */
class WriteRolledBack extends Error {
  constructor() {
    super('v1 write rolled back by its in-transaction check');
    this.name = 'WriteRolledBack';
  }
}

/**
 * Runs one mutation in a DataFn transact call, whose one rate-limit and
 * authorization check runs before anything is stored. Inside the same
 * database transaction, after the mutation, it checks the namespace's
 * end-to-end encryption setting again (turned on since the route's check:
 * the write rolls back and answers 409) and reads the written row by id, so
 * the answer and the index hold exactly this write's revision. A query step
 * in the transact call would load every row of the resource (DataFn pushes
 * no filter down there). A failed mutation comes back as a failed result;
 * other failures, a failed readback included (it rolls the write back), come
 * back as problems.
 */
async function mutate(app: InterfaceApp, caller: Caller, payload: Row): Promise<Written> {
  const resource = payload.resource as string;
  const namespace = resolveAccountUserNamespace(caller.actorId);
  const inTransaction: { checked: boolean; encrypted: boolean; failure?: unknown; row: Row | null } =
    { checked: false, encrypted: false, row: null };
  const check = async (transaction: StoredTransaction) => {
    try {
      if (encryptionEnabled(await transaction.read('kv', E2EE_SETTINGS_ID, namespace))) {
        inTransaction.encrypted = true;
      } else {
        inTransaction.row = visibleRow(app, resource, await transaction.read(resource, payload.id as string, namespace));
        inTransaction.checked = true;
        return;
      }
    } catch (error) {
      inTransaction.failure = error;
    }
    throw new WriteRolledBack();
  };
  const settle = () => {
    if (inTransaction.encrypted) throw encryptedProblem();
    if (inTransaction.failure !== undefined) {
      caller.services.logError?.('v1 API write readback failed; the write was rolled back', failureSummary(inTransaction.failure));
      throw new ApiProblem(500, 'internal', 'The request could not be completed.');
    }
  };
  let response: TransactResult;
  try {
    response = await run(() => caller.services.inWriteTransaction(check, async () => {
      try {
        return await caller.executor.transact({ steps: [{ mutation: payload }] }, caller.context) as TransactResult;
      } catch (error) {
        if (error instanceof DatafnExecutorError && error.code === 'CONFLICT') {
          const path = (error.details as { path?: unknown } | undefined)?.path;
          const failed: MutationResult = {
            ok: false,
            errors: [{ code: 'CONFLICT', message: error.message, path: typeof path === 'string' ? path : undefined }]
          };
          return { ok: false, results: [failed] } satisfies TransactResult;
        }
        throw error;
      }
    }), 'write', caller.services);
  } catch (error) {
    settle();
    throw error;
  }
  settle();
  const [step] = Array.isArray(response.results) ? response.results : [];
  const result = isMutationResult(step)
    ? step
    : { ok: false, errors: [{ code: 'INTERNAL', message: 'DataFn returned no mutation result.' }] };
  if (!result.ok) return { result, row: null };
  // DataFn runs every successful transact mutation, a replay included, in one transaction.
  if (!inTransaction.checked) throw new Error('v1 write finished without its in-transaction check');
  return { result, row: inTransaction.row };
}

/**
 * A row with a space's items filtered as this token's DataFn read filters
 * them. Other resources come back unchanged. A write's answer takes the
 * committed revision's items, filtered after the commit (and after the
 * index update, which a failed lookup here must not skip), so those
 * lookups never run while the write holds its row.
 */
async function withScopedItems(
  app: InterfaceApp,
  caller: Caller,
  resource: string,
  row: Row
): Promise<Row> {
  if (resolveInterfaceSharedFilter(app, resource as InterfaceExposedResource)?.kind !== 'items') return row;
  const namespace = resolveAccountUserNamespace(caller.actorId);
  const body = { ok: true, result: { data: [row] } };
  const filtered = await filterScopedResponseBody(
    'query',
    { resource, version: 1 },
    body,
    resolveAppScopeAccess(caller.context.session ?? { scopes: [] }).read,
    { findMany: (model, where) => caller.services.findStored(model, where, namespace) },
    nucleumDatafnSchema
  ) as typeof body;
  return filtered.result.data[0] ?? row;
}

/**
 * A row as a DataFn read in this app shows it: null when it is missing,
 * trashed or holds a type outside this app's view.
 */
function visibleRow(app: InterfaceApp, resource: string, row: Row | null): Row | null {
  if (!row || (hasCapability(resource, 'trash') && row.trashedAt != null)) return null;
  const shared = resolveInterfaceSharedFilter(app, resource as InterfaceExposedResource);
  const visible = resolveInterfaceVisibleTypes(app);
  if (shared?.kind === 'field' && visible !== 'all' && !visible.includes(String(row.resource))) return null;
  // As a DataFn read does: an unset optional field the schema keeps non-null reads as absent.
  const schema = nucleumDatafnSchema.resources.find((entry) => entry.name === resource) as DatafnResourceSchema | undefined;
  return stripNullsForNonNullableFields(row, schema);
}

/**
 * Indexes a record a v1 write committed. DataFn's ordinary mutation route
 * indexes the stored record after its write, but its transact call does not,
 * so the API does the same with the sync server's provider and namespace.
 * As in DataFn, a failed index update is logged and does not fail the write.
 */
async function indexWritten(caller: Caller, resource: string, stored: Row): Promise<void> {
  const index = caller.services.getSearchIndex?.();
  if (!index) return;
  try {
    await index.provider.updateIndices({
      resource,
      records: [{
        ...stored,
        __ns: resolveAccountUserNamespace(caller.actorId),
        ...(index.regionId ? { __region: index.regionId } : {})
      }],
      operation: 'upsert'
    });
  } catch (error) {
    caller.services.logError?.('v1 API search index update failed; the write stands', failureSummary(error));
  }
}

function isMutationResult(value: unknown): value is MutationResult {
  return typeof value === 'object' && value !== null && typeof (value as MutationResult).ok === 'boolean';
}

/** A write of a completion rule's `checked` field also sets its `completedAt`. */
function applyDerivedFields(contract: InterfaceResourceContract, record: Row): void {
  for (const rule of contract.derived ?? []) {
    if (rule.kind === 'completion' && rule.checked in record) {
      record[rule.completedAt] = record[rule.checked] === true ? Date.now() : null;
    }
  }
}

async function search(
  searchable: string[],
  caller: Caller,
  ctx: RouteContext
): Promise<Response> {
  const params = ctx.query;
  for (const name of new Set(params.keys())) {
    if (!['q', 'resource', 'limit'].includes(name)) throw parameterProblem(name, `Unknown query parameter ${name}.`);
    if (params.getAll(name).length > 1) throw parameterProblem(name, `${name} may be given once.`);
  }
  const text = params.get('q')?.trim() ?? '';
  if (text.length === 0 || text.length > 256) throw parameterProblem('q', 'q must hold 1 to 256 characters.');
  const resource = params.get('resource');
  if (resource !== null && !searchable.includes(resource)) {
    throw parameterProblem('resource', `resource must be one of ${searchable.join(', ')}.`);
  }
  const limit = parseLimit(params.get('limit'), DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
  const result = await run<{ results: SearchHit[] }>(() => caller.executor.search({
    query: text,
    resources: resource ? [resource] : searchable,
    limit
  }, caller.context), 'read', caller.services);
  const data = result.results
    .filter((hit) => searchable.includes(hit.resource))
    .map((hit) => ({
      resource: hit.resource,
      id: hit.id,
      score: hit.score,
      record: project(interfaceResources[hit.resource as InterfaceExposedResource], { id: hit.id, ...hit.data })
    }));
  return Response.json({ data });
}

/**
 * Keeps a row's contract fields. Queries send no `select`: DataFn reads a
 * selected relation field (such as `typeToExtend`) as a relation expansion,
 * which app-scoped tokens may not make, while unselected rows carry its id.
 */
function project(contract: InterfaceResourceContract, row: Row): Row {
  return Object.fromEntries(contract.fields.filter((name) => row[name] !== undefined)
    .map((name) => [name, serializeField(resolveApiField(contract.resource, name), row[name])]));
}

/**
 * Serializes numbers as JSON numbers. PostgreSQL `numeric` columns reach
 * DataFn as strings and `bigint` ones may arrive as bigints.
 */
export function serializeField(field: ApiField, value: unknown): unknown {
  if (field.kind !== 'number' && field.kind !== 'integer') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  return value;
}

function resourceIdPrefix(resource: string): string {
  const declared = nucleumDatafnSchema.resources.find((entry) => entry.name === resource) as
    { idPrefix?: string } | undefined;
  return declared?.idPrefix ?? resource;
}

function parseLimit(raw: string | null, fallback: number, max: number): number {
  if (raw === null) return fallback;
  const limit = Number(raw);
  if (!/^\d+$/.test(raw) || limit < 1 || limit > max) {
    throw parameterProblem('limit', `limit must be a whole number from 1 to ${max}.`);
  }
  return limit;
}

function encodeCursor(cursor: Cursor): string {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decodes a cursor, which must come from a page with the same sort. */
function decodeCursor(raw: string, sort: string, field: ApiField): Cursor {
  const invalid = parameterProblem('cursor', 'cursor is not a nextCursor of this list with this sort.');
  let decoded: unknown;
  try {
    if (!/^[\w-]+$/.test(raw)) throw invalid;
    const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
  } catch {
    throw invalid;
  }
  const cursor = decoded as Partial<Cursor> | null;
  if (typeof cursor !== 'object' || cursor === null || Array.isArray(cursor) || cursor.sort !== sort ||
    typeof cursor.id !== 'string' || cursor.id.length === 0 || !('value' in cursor) ||
    Object.keys(cursor).some((key) => !['sort', 'value', 'id'].includes(key))) {
    throw invalid;
  }
  // A value of another kind would reach the database as a bad comparison.
  const value = cursorValue(field, cursor.value);
  if (value === undefined) throw invalid;
  return { sort, value, id: cursor.id };
}

async function readBody(ctx: RouteContext): Promise<unknown> {
  try {
    return await ctx.json();
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error && error.statusCode === 413) {
      throw new ApiProblem(413, 'body_too_large', `The body may hold at most ${MAX_BODY_BYTES} bytes.`);
    }
    throw new ApiProblem(400, 'invalid_json', 'The body must be JSON.');
  }
}

type KeyState = 'new' | 'in_progress' | 'done';

interface KeyedWrite {
  enabled: boolean;
  /** Digest of the caller, app, operation, target and key; empty without a key. */
  key: string;
  /** DataFn's replay identity: the scoped key and the body. */
  mutation: Row;
  /**
   * `done` when a request with this key and body already wrote, and
   * `in_progress` while one is still writing; `new` otherwise.
   */
  state: KeyState;
  /**
   * Runs the write. `perform` calls `committed` as soon as its mutation is
   * stored (before reading the record back), which binds the key to this
   * body for the replay window. A failure before that frees the key this
   * request claimed; a key recorded done is never freed.
   */
  write(perform: (committed: () => Promise<void>) => Promise<Response>): Promise<Response>;
}

interface KeyClaim {
  fingerprint: string;
  state: 'pending' | 'done';
  /** Names the request holding a pending claim, so only it frees the claim. */
  owner?: string;
}

/**
 * Scopes an `Idempotency-Key` to the token's account, this app, the matched
 * operation and its target (the decoded record id, not the raw path), and
 * binds it to the body. DataFn replays a repeated write by its mutation id,
 * which covers both, so another account or another body never replays this
 * write. The idempotency store refuses the key with another body, answers a
 * finished key without writing again, and shows a key still being written.
 */
async function idempotency(
  app: InterfaceApp,
  request: Request,
  caller: Caller,
  body: Row,
  target: string[]
): Promise<KeyedWrite> {
  const value = request.headers.get('idempotency-key');
  const noClaim = (perform: (committed: () => Promise<void>) => Promise<Response>) => perform(async () => undefined);
  if (value === null) {
    return { enabled: false, key: '', mutation: {}, state: 'new', write: noClaim };
  }
  if (!IDEMPOTENCY_KEY.test(value)) {
    throw parameterProblem('Idempotency-Key', 'Idempotency-Key must be 1 to 255 visible ASCII characters.');
  }
  const key = await scopedKey(caller.actorId, app, target, value);
  const fingerprint = await sha256Hex(canonicalJson(body));
  const mutation = { clientId: `v1-${app}`, mutationId: await sha256Hex(`${key}\n${fingerprint}`) };
  const store = caller.services.idempotencyStore;
  if (!store) {
    return { enabled: true, key, mutation, state: 'new', write: noClaim };
  }
  const claim = `v1-idempotency:${key}`;
  const pending = JSON.stringify({ fingerprint, state: 'pending', owner: crypto.randomUUID() } satisfies KeyClaim);
  const done = JSON.stringify({ fingerprint, state: 'done' } satisfies KeyClaim);
  const result = await store.setIfAbsent({ key: claim, value: pending, ttlSeconds: IDEMPOTENCY_PENDING_SECONDS });
  let state: KeyState = 'new';
  if (!result.inserted) {
    const existing = parseClaim(result.existing);
    if (existing && existing.fingerprint !== fingerprint) throw idempotencyKeyReused();
    state = existing?.state === 'done' ? 'done' : 'in_progress';
  }
  const logFailure = (error: unknown) => caller.services.logError?.('v1 idempotency key update failed', failureSummary(error));
  return {
    enabled: true,
    key,
    mutation,
    state,
    write: async (perform) => {
      let stored = false;
      const committed = async () => {
        if (stored) return;
        stored = true;
        await store.set({ key: claim, value: done, ttlSeconds: IDEMPOTENCY_TTL_SECONDS }).catch(logFailure);
      };
      try {
        return await perform(committed);
      } catch (error) {
        // A write that never stored frees only the pending claim this request
        // made; once any request records the key done, it stays bound.
        if (!stored && result.inserted) await releaseClaim(store, claim, pending).catch(logFailure);
        throw error;
      }
    }
  };
}

/** Deletes a claim only while it still holds this request's pending value. */
async function releaseClaim(store: ConditionalKVStoreAdapter, claim: string, pending: string): Promise<void> {
  if (await store.get(claim) === pending) await store.delete(claim);
}

/** The digest naming one `Idempotency-Key` of one account, app, operation and target. */
async function scopedKey(actorId: string, app: InterfaceApp, target: string[], value: string): Promise<string> {
  return sha256Hex(JSON.stringify([actorId, app, ...target, value]));
}

function keyedId(resource: string, key: string): string {
  return `${resourceIdPrefix(resource)}:${digestUuid(key)}`;
}

/** The id every create with this account's `Idempotency-Key` writes. */
export async function keyedCreateId(
  actorId: string,
  app: InterfaceApp,
  resource: string,
  value: string
): Promise<string> {
  return keyedId(resource, await scopedKey(actorId, app, ['create', resource], value));
}

function parseClaim(value: string | undefined): KeyClaim | null {
  if (value === undefined) return null;
  try {
    const claim = JSON.parse(value) as Partial<KeyClaim>;
    if (typeof claim.fingerprint === 'string' && (claim.state === 'pending' || claim.state === 'done')) {
      return claim as KeyClaim;
    }
  } catch {
    // An unreadable claim is treated as one still being written.
  }
  return null;
}

function idempotencyInProgress(): ApiProblem {
  return new ApiProblem(409, 'idempotency_in_progress',
    'A request with this Idempotency-Key is still being processed; retry shortly.', {}, { 'retry-after': '1' });
}

function idempotencyKeyReused(): ApiProblem {
  return new ApiProblem(422, 'idempotency_key_reused', 'This Idempotency-Key was already used with another body.');
}

function idempotencyConflict(): ApiProblem {
  return new ApiProblem(409, 'idempotency_conflict',
    'The record this Idempotency-Key created is no longer visible to this token.');
}

/** A UUID (RFC 9562 version 8) taken from a hex digest. */
function digestUuid(digest: string): string {
  const hex = digest.slice(0, 32).split('');
  hex[12] = '8';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const text = hex.join('');
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20, 32)}`;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** JSON with object keys sorted, so equal values serialize alike. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    // Code-unit order, not locale order, so a body's fingerprint never depends on the runtime's locale.
    return `{${Object.keys(value).sort((a, b) => (a < b ? -1 : Number(a > b))).map((name) =>
      `${JSON.stringify(name)}:${canonicalJson((value as Row)[name])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function mutationProblem(result: MutationResult, caller: Caller): ApiProblem {
  const error = result.errors?.[0];
  return datafnProblem(undefined, error?.code, error?.message, 'write', caller.services);
}

async function run<T>(
  operation: () => Promise<T>,
  access: Access,
  services: InterfaceApiServices | undefined
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DatafnExecutorError) {
      throw datafnProblem(error.status, error.code, error.message, access, services);
    }
    throw error;
  }
}

/** DataFn codes that describe the caller's input rather than a server failure. */
const CALLER_INPUT_CODES = new Set(['LIMIT_EXCEEDED', 'RELATION_RESTRICTED', 'DATAFN_PAYLOAD_TOO_LARGE']);

/**
 * Maps a DataFn failure to a problem, without exposing internal errors.
 * DataFn answers most failures, its own internal ones included, with HTTP
 * 400, so the code decides; the status counts only when there is no code.
 */
function datafnProblem(
  status: number | undefined,
  code: string | undefined,
  message: string | undefined,
  access: Access,
  services: InterfaceApiServices | undefined
): ApiProblem {
  const kind = code === undefined ? statusKind(status) : codeKind(code);
  switch (kind) {
    case 'not_found':
      return new ApiProblem(404, 'not_found', 'No record with that id is visible to this token.');
    case 'forbidden':
      return new ApiProblem(403, 'forbidden', 'This token may not reach that record.');
    case 'conflict':
      return new ApiProblem(409, 'conflict', message ?? 'The write conflicts with the stored record.');
    case 'rate_limited':
      return new ApiProblem(429, 'rate_limited', 'Too many requests; retry later.');
    case 'invalid':
      return access === 'write'
        ? validationProblem([{ pointer: '', detail: message ?? 'The write is invalid.' }])
        : new ApiProblem(400, 'invalid_request', message ?? 'The request is invalid.');
    default:
      // The message can quote stored content (a failed insert's values), so only the code is logged.
      services?.logError?.('v1 API DataFn request failed', { code, status });
      return new ApiProblem(500, 'internal', 'The request could not be completed.');
  }
}

type FailureKind = 'not_found' | 'forbidden' | 'conflict' | 'rate_limited' | 'invalid' | 'internal';

function codeKind(code: string): FailureKind {
  if (code === 'NOT_FOUND') return 'not_found';
  if (code === 'FORBIDDEN') return 'forbidden';
  if (code === 'CONFLICT') return 'conflict';
  if (code === 'RATE_LIMITED' || code === 'DATAFN_ROUTE_RATE_LIMITED') return 'rate_limited';
  if (code.startsWith('DFQL_') || CALLER_INPUT_CODES.has(code)) return 'invalid';
  return 'internal';
}

function statusKind(status: number | undefined): FailureKind {
  switch (status) {
    case 404: return 'not_found';
    case 403: return 'forbidden';
    case 409: return 'conflict';
    case 429: return 'rate_limited';
    case 400: return 'invalid';
    default: return 'internal';
  }
}

/**
 * The problem a request's failure answers with: an API problem as is, an
 * authfn client error (such as a rate limit) with its status and code, and
 * anything else as a 500 that logs only the failure's class under `label`.
 */
export function toProblem(
  error: unknown,
  services: Pick<InterfaceApiServices, 'logError'> | undefined,
  label = 'v1 API request failed'
): ApiProblem {
  if (error instanceof ApiProblem) return error;
  if (error instanceof AuthFnError && error.status < 500) {
    return new ApiProblem(error.status, error.code.toLowerCase(), error.message);
  }
  services?.logError?.(label, failureSummary(error));
  return new ApiProblem(500, 'internal', 'The request could not be completed.');
}

/** A failure's class, code and status: unlike its message, they never quote stored content. */
function failureSummary(error: unknown): FailureSummary {
  if (typeof error !== 'object' || error === null) return { name: typeof error };
  const { name, code, status } = error as { name?: unknown; code?: unknown; status?: unknown };
  return {
    ...(typeof name === 'string' ? { name } : {}),
    ...(typeof code === 'string' ? { code } : {}),
    ...(typeof status === 'number' ? { status } : {})
  };
}
