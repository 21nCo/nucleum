import { createRouter, type Route, type RouteContext, type Router } from '@superfunctions/http';
import { DatafnExecutorError, type DatafnExecutor } from '@datafn/server';
import { AuthFnError, type AuthFnSession } from 'authfn';
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
import { resolveAppScopeAccess, type AppGrant } from '../datafn/app-scopes.js';
import { ApiProblem, parameterProblem, problemSchema, validationProblem } from './problem.js';
import {
  parseFilterValue,
  recordSchema,
  resolveApiField,
  resourceSegment,
  resourceTitle,
  validateWriteBody,
  writeSchema,
  type JsonSchema
} from './resources.js';

/** What a router needs to serve requests. Without it the router only describes the API. */
export interface InterfaceApiServices {
  authenticate(request: Request): Promise<AuthFnSession | null> | AuthFnSession | null;
  getSyncServer(): Promise<SyncServer>;
  regionId?: string;
  /** Records failures the API answers with a 500. */
  logError?(message: string, error: unknown): void;
}

type Access = 'read' | 'write';
type Row = Record<string, unknown>;

interface Caller {
  executor: DatafnExecutor<SyncContext>;
  context: SyncContext;
}

interface QueryResult {
  data: Row[];
  nextCursor?: Row | null;
}

interface MutationResult {
  ok: boolean;
  affectedIds?: string[];
  errors?: { code?: string; message?: string }[];
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
          : 'Rows are filtered to this app after the query runs, so the list is not paged.'),
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
        responses: { 200: { description: 'The record.', schema: record }, ...errorResponses(401, 403, 404, 429) }
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
        body: writeSchema(contract, 'create'),
        responses: { 201: { description: 'The created record.', schema: record }, ...errorResponses(400, 401, 403, 422, 429) }
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
        description: `Sets only the fields in the body. Requires ${scope('write')}. ${idempotencyNote}`,
        tags,
        headers: idempotencyHeader,
        body: writeSchema(contract, 'update'),
        responses: { 200: { description: 'The updated record.', schema: record }, ...errorResponses(400, 401, 403, 404, 422, 429) }
      }
    });
  }
  return routes;
}

const idempotencyNote =
  'Repeating the request with the same `Idempotency-Key` returns the first result without writing again.';

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
  400: '400 invalid parameter, cursor or header',
  401: '401 missing, invalid, expired or revoked token',
  403: '403 token lacks the scope or may not reach the record',
  404: '404 no visible record with that id',
  422: '422 invalid body',
  429: '429 rate limited'
};

/** One `4XX` problem response listing the statuses an operation answers with. */
function errorResponses(...statuses: number[]): Record<string, { description: string; schema: JsonSchema }> {
  return {
    '4XX': {
      description: `Problem details: ${statuses.map((status) => ERROR_DESCRIPTIONS[status]).join('; ')}.`,
      schema: problemSchema as unknown as JsonSchema
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

/**
 * Authenticates the bearer token alone (cookies are dropped, so a browser
 * session never authorizes a call), checks it holds this app's scope for the
 * access, and narrows it to this app's scopes for DataFn.
 */
async function resolveCaller(
  app: InterfaceApp,
  access: Access,
  request: Request,
  services: InterfaceApiServices | undefined
): Promise<Caller> {
  if (!services) {
    throw new ApiProblem(503, 'unavailable', 'This router only describes the API.');
  }
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
  const grants = resolveAppScopeAccess(session);
  const scopes = interfaceContract[app].scopes;
  const needed = access === 'read' ? [scopes.read] : [scopes.read, scopes.write];
  if (!grantCovers(grants.read, app) || (access === 'write' && !grantCovers(grants.write, app))) {
    throw new ApiProblem(403, 'insufficient_scope', `This token needs ${needed.join(' and ')}.`, { scopes: needed }, {
      'www-authenticate': `Bearer realm="${app}", error="insufficient_scope", scope="${needed.join(' ')}"`
    });
  }
  const narrowed = { ...session, scopes: grantCovers(grants.write, app) ? [scopes.read, scopes.write] : [scopes.read] };
  const server = await services.getSyncServer();
  return {
    executor: server.executor,
    context: { request: tokenRequest, session: narrowed, publicLink: null, regionId: services.regionId }
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
  const query: Row = {
    resource: contract.resource,
    version: 1,
    filters,
    sort: [sort, 'id']
  };
  if (paged) {
    query.limit = parseLimit(params.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = params.get('cursor');
    if (cursor !== null) query.cursor = { after: decodeCursor(cursor, sort) };
  }
  const result = await run<QueryResult>(() => caller.executor.query(query, caller.context), 'read');
  return Response.json({
    data: result.data.map((row) => project(contract, row)),
    nextCursor: paged && result.nextCursor ? encodeCursor(sort, result.nextCursor) : null
  });
}

async function getRecord(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  id: string
): Promise<Row> {
  const prefix = resourceIdPrefix(contract.resource);
  const notFound = new ApiProblem(404, 'not_found', `No ${contract.resource} ${id} is visible to this token.`);
  if (!id.startsWith(`${prefix}:`)) throw notFound;
  const filters: Row = { id: { eq: id } };
  const visible = sharedFieldConstraint(app, contract);
  if (visible) filters.resource = { in: visible };
  const paged = resolveInterfaceSharedFilter(app, contract.resource as InterfaceExposedResource)?.paged !== false;
  const result = await run<QueryResult>(() => caller.executor.query({
    resource: contract.resource,
    version: 1,
    filters,
    ...(paged ? { limit: 1 } : {})
  }, caller.context), 'read');
  const row = result.data.find((entry) => entry.id === id);
  if (!row) throw notFound;
  return project(contract, row);
}

async function createRecord(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  ctx: RouteContext,
  request: Request,
  collectionPath: string
): Promise<Response> {
  const record = validateWriteBody(contract, 'create', await readBody(ctx));
  const visible = sharedFieldConstraint(app, contract);
  if (visible && !visible.includes(String(record.resource))) {
    throw validationProblem([{ pointer: '/resource', detail: `resource must be one of ${visible.join(', ')}.` }]);
  }
  applyDerivedFields(contract, record);
  const id = `${resourceIdPrefix(contract.resource)}:${crypto.randomUUID()}`;
  const result = await mutate(caller, {
    resource: contract.resource,
    version: 1,
    operation: 'insert',
    id,
    record,
    ...(await idempotency(app, request))
  });
  const createdId = result.affectedIds?.[0] ?? id;
  const created = await getRecord(app, contract, caller, createdId);
  return Response.json(created, {
    status: 201,
    headers: {
      location: `${collectionPath}/${encodeURIComponent(createdId)}`,
      ...(result.deduped ? { 'idempotent-replayed': 'true' } : {})
    }
  });
}

async function updateRecord(
  app: InterfaceApp,
  contract: InterfaceResourceContract,
  caller: Caller,
  ctx: RouteContext,
  request: Request
): Promise<Response> {
  const record = validateWriteBody(contract, 'update', await readBody(ctx));
  const id = ctx.params.id;
  await getRecord(app, contract, caller, id);
  applyDerivedFields(contract, record);
  const result = await mutate(caller, {
    resource: contract.resource,
    version: 1,
    operation: 'merge',
    id,
    record,
    ...(await idempotency(app, request))
  });
  return Response.json(await getRecord(app, contract, caller, id), {
    headers: result.deduped ? { 'idempotent-replayed': 'true' } : {}
  });
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
  }, caller.context), 'read');
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
  return Object.fromEntries(contract.fields.filter((name) => row[name] !== undefined).map((name) => [name, row[name]]));
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

function encodeCursor(sort: string, after: Row): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ sort, after }));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decodes a cursor, which must come from a page with the same sort. */
function decodeCursor(cursor: string, sort: string): Row {
  const invalid = parameterProblem('cursor', 'cursor is not a nextCursor of this list with this sort.');
  let decoded: unknown;
  try {
    if (!/^[\w-]+$/.test(cursor)) throw invalid;
    const binary = atob(cursor.replace(/-/g, '+').replace(/_/g, '/'));
    decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
  } catch {
    throw invalid;
  }
  const keys = new Set([sort.replace(/^-/, ''), 'id']);
  const after = (decoded as { after?: unknown } | null)?.after;
  if ((decoded as { sort?: unknown } | null)?.sort !== sort || typeof after !== 'object' || after === null ||
    Array.isArray(after) || !Object.entries(after).every(([key, value]) =>
      keys.has(key) && (value === null || ['string', 'number', 'boolean'].includes(typeof value)))) {
    throw invalid;
  }
  return after as Row;
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

/**
 * Binds an `Idempotency-Key` to this app, method and path as the DataFn
 * mutation id, so DataFn replays the first result of a repeated write.
 */
async function idempotency(app: InterfaceApp, request: Request): Promise<Row> {
  const key = request.headers.get('idempotency-key');
  if (key === null) return {};
  if (!IDEMPOTENCY_KEY.test(key)) {
    throw parameterProblem('Idempotency-Key', 'Idempotency-Key must be 1 to 255 visible ASCII characters.');
  }
  const scope = `${request.method} ${new URL(request.url).pathname}\n${key}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope));
  return {
    clientId: `v1-${app}`,
    mutationId: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  };
}

async function mutate(caller: Caller, mutation: Row): Promise<MutationResult> {
  const result = await run<MutationResult>(() => caller.executor.mutate(mutation, caller.context), 'write');
  if (!result.ok) {
    const error = result.errors?.[0];
    throw datafnProblem(undefined, error?.code, error?.message, 'write');
  }
  return result;
}

async function run<T>(operation: () => Promise<T>, access: Access): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DatafnExecutorError) {
      throw datafnProblem(error.status, error.code, error.message, access);
    }
    throw error;
  }
}

/** Maps a DataFn failure to a problem, without exposing internal errors. */
function datafnProblem(
  status: number | undefined,
  code: string | undefined,
  message: string | undefined,
  access: Access
): ApiProblem {
  if (status === 404 || code === 'NOT_FOUND') {
    return new ApiProblem(404, 'not_found', 'No record with that id is visible to this token.');
  }
  if (status === 403 || code === 'FORBIDDEN') {
    return new ApiProblem(403, 'forbidden', 'This token may not reach that record.');
  }
  if (status === 409 || code === 'CONFLICT') {
    return new ApiProblem(409, 'conflict', message ?? 'The write conflicts with the stored record.');
  }
  if (status === 429 || code === 'RATE_LIMITED') {
    return new ApiProblem(429, 'rate_limited', 'Too many requests; retry later.');
  }
  if (status === 400 || code === 'DFQL_INVALID') {
    return access === 'write'
      ? validationProblem([{ pointer: '', detail: message ?? 'The write is invalid.' }])
      : new ApiProblem(400, 'invalid_request', message ?? 'The request is invalid.');
  }
  return new ApiProblem(500, 'internal', 'The request could not be completed.');
}

function toProblem(error: unknown, services: InterfaceApiServices | undefined): ApiProblem {
  if (error instanceof ApiProblem) return error;
  if (error instanceof AuthFnError && error.status < 500) {
    return new ApiProblem(error.status, error.code.toLowerCase(), error.message);
  }
  services?.logError?.('v1 API request failed', error);
  return new ApiProblem(500, 'internal', 'The request could not be completed.');
}
