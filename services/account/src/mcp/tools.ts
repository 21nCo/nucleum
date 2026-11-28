import {
  defineMcpFnServer,
  structuredResult,
  type McpFnObjectSchema,
  type McpFnServerDeclaration,
  type McpFnToolDefinition,
  type McpFnToolVisibilityInput
} from '@mcpfn/core';
import { createDatafnMcpAdapter } from '@mcpfn/datafn';
import type { DatafnExecutor } from '@datafn/server';
import type { Route } from '@superfunctions/http';
import { nucleumDatafnSchema } from '@nucleum/schema/datafn';
import {
  interfaceContract,
  resolveInterfaceResources,
  type InterfaceApp,
  type InterfaceResourceContract
} from '@nucleum/schema/interfaces';
import { createInterfaceApiRouter, notVisible } from '../api/router.js';
import { resourceSegment } from '../api/resources.js';

type JsonSchema = Record<string, unknown>;
type CallToolResult = ReturnType<typeof structuredResult>;
type ToolAnnotations = NonNullable<McpFnToolDefinition<McpCaller>['annotations']>;

/** One call a tool makes to its app's v1 REST API. */
export interface McpApiCall {
  method: 'GET' | 'POST' | 'PATCH';
  /** The route path with its parameters filled in and percent-encoded. */
  path: string;
  query?: URLSearchParams;
  body?: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * The trusted context of one MCP request: the app, the scopes the caller's
 * token holds for it, and a way to call that app's v1 API as the caller.
 * Built by the HTTP route after authentication, never from tool arguments.
 */
export interface McpCaller {
  app: InterfaceApp;
  scopes: readonly string[];
  callApi(call: McpApiCall): Promise<Response>;
}

/** One app's MCP server declaration and the scope gate its runtime needs. */
export interface InterfaceMcpServer {
  declaration: McpFnServerDeclaration<McpCaller>;
  toolVisibility(input: McpFnToolVisibilityInput<McpCaller>): Promise<boolean>;
}

/** Tool argument that carries the v1 API's `Idempotency-Key`. */
const IDEMPOTENCY_ARGUMENT = 'idempotencyKey';
/** Tool metadata key listing the scopes a tool needs. */
export const SCOPES_METADATA = 'nucleum/requiredScopes';
/** Problem members that become the tool error's code and message rather than details. */
const PROBLEM_MEMBERS = new Set(['type', 'title', 'status', 'detail', 'code']);

const idempotencySchema: JsonSchema = {
  type: 'string',
  pattern: '^[\\x21-\\x7e]{1,255}$',
  description:
    'Client-chosen key (1 to 255 printable ASCII characters) that makes retries safe: repeating the call with ' +
    'the same key and arguments does not write again and returns the record\'s current state. A key is ' +
    'remembered for 24 hours; reusing it with other arguments fails with `idempotency_key_reused`.'
};

const readAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

/**
 * DataFn executor handed to the `@mcpfn/datafn` adapter, which here only
 * gates tools by scope: nothing is exposed through its generated DataFn
 * tools, so it never runs a query or mutation. Every tool calls the app's
 * v1 REST API instead, which applies the shared-resource filters, derived
 * fields, reference checks, encryption refusal, idempotency and search
 * indexing that a direct DataFn call would skip.
 */
const contractOnlyExecutor: DatafnExecutor<never> = {
  schema: nucleumDatafnSchema as unknown as DatafnExecutor['schema'],
  query: refuseDirectDatafn,
  mutate: refuseDirectDatafn,
  transact: refuseDirectDatafn,
  search: refuseDirectDatafn
};

function refuseDirectDatafn(): never {
  throw new Error('The interface MCP servers call the v1 API, never DataFn directly.');
}

/**
 * Builds one app's MCP server from its v1 REST routes, which the interface
 * contract generates: a tool per route (list, get, create and update for
 * each exposed resource, and search), never a delete or bulk tool. Read
 * tools need the app's read scope and write tools its read and write
 * scopes, as the routes do. The declaration has no side effects, so the
 * same one serves requests and produces the checked-in manifest.
 */
export function createInterfaceMcpServer(app: InterfaceApp): InterfaceMcpServer {
  const scopes = interfaceContract[app].scopes;
  const adapter = createDatafnMcpAdapter<McpCaller, never>({
    executor: contractOnlyExecutor,
    expose: {},
    context: refuseDirectDatafn,
    clientId: `mcp:${app}`,
    sessionScopes: (caller) => caller.scopes
  });
  const contracts = new Map(resolveInterfaceResources(app)
    .map((contract) => [resourceSegment(contract.resource), contract]));
  for (const route of createInterfaceApiRouter(app).getRoutes()) {
    const needed = route.method === 'GET' ? [scopes.read] : [scopes.read, scopes.write];
    const resource = (route.meta as { tags?: string[] } | undefined)?.tags?.[0] ?? '';
    adapter.registerTool(routeTool(route, contracts.get(resource), needed), { scopes: needed });
  }
  return {
    declaration: defineMcpFnServer<McpCaller>({
      info: { name: app, version: '1.0.0' },
      registry: adapter.registry
    }),
    toolVisibility: (input) => adapter.toolVisibility(input)
  };
}

interface RouteMeta {
  operationId: string;
  summary: string;
  description: string;
  query?: Record<string, JsonSchema>;
  body?: JsonSchema & { properties?: Record<string, JsonSchema>; required?: string[] };
}

/**
 * The tool that calls one v1 route, given the contract of the resource it
 * serves (search serves none). Its `scopes` are recorded in the tool's
 * metadata, so the manifest snapshot also catches a change of them.
 */
function routeTool(
  route: Route,
  contract: InterfaceResourceContract | undefined,
  scopes: string[]
): McpFnToolDefinition<McpCaller> {
  const meta = route.meta as unknown as RouteMeta;
  const name = meta.operationId.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const item = route.path.endsWith('/:id');
  if (item && !contract) throw new Error(`${route.method} ${route.path} serves no resource of the contract.`);
  const idSchema: JsonSchema = { type: 'string', minLength: 1, description: 'The record id.' };
  const fields = route.method === 'GET' ? meta.query ?? {} : meta.body?.properties ?? {};
  for (const reserved of ['id', IDEMPOTENCY_ARGUMENT]) {
    if (reserved in fields) throw new Error(`${route.method} ${route.path} has a ${reserved} field, which a tool argument holds.`);
  }
  const properties: Record<string, JsonSchema> = {
    ...(item ? { id: idSchema } : {}),
    ...fields,
    ...(route.method === 'GET' ? {} : { [IDEMPOTENCY_ARGUMENT]: idempotencySchema })
  };
  const required = [
    ...(item ? ['id'] : []),
    ...(route.method === 'POST' ? meta.body?.required ?? [] : []),
    ...(meta.operationId === 'search' ? ['q'] : [])
  ];
  return {
    name,
    title: meta.summary,
    description: toolDescription(route, meta, contract?.description ?? ''),
    inputSchema: {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
      additionalProperties: false
    } as McpFnObjectSchema,
    annotations: route.method === 'GET'
      ? readAnnotations
      : {
          readOnlyHint: false,
          destructiveHint: route.method === 'PATCH',
          idempotentHint: false,
          openWorldHint: false
        },
    metadata: { [SCOPES_METADATA]: scopes },
    handler: async (args, caller) => {
      const { id, [IDEMPOTENCY_ARGUMENT]: key, ...rest } = args;
      let path = route.path;
      if (item && contract) {
        const segment = idSegment(String(id));
        if (segment === null) return toolResult(notVisible(contract, String(id)).toResponse());
        path = route.path.replace(':id', segment);
      }
      const call: McpApiCall = { method: route.method as McpApiCall['method'], path };
      if (route.method === 'GET') {
        call.query = new URLSearchParams(Object.entries(rest).map(([field, value]) => [field, String(value)]));
      } else {
        call.body = rest;
        if (typeof key === 'string') call.idempotencyKey = key;
      }
      return toolResult(await caller.callApi(call));
    }
  };
}

/**
 * The percent-encoded path segment of a record id, or null for an id no
 * record can have that would not stay one segment: `.` and `..`, which URL
 * parsing collapses into the parent route, and a string with a lone UTF-16
 * surrogate, which has no UTF-8 encoding.
 */
function idSegment(id: string): string | null {
  if (id === '.' || id === '..') return null;
  try {
    return encodeURIComponent(id);
  } catch {
    return null;
  }
}

function toolDescription(route: Route, meta: RouteMeta, resourceDescription: string): string {
  if (route.method === 'GET') return `${meta.summary}. ${meta.description}`;
  const scope = meta.description.match(/Requires [^.]+\./)?.[0] ?? '';
  const update = route.method === 'PATCH'
    ? ' Sets only the fields given. Fails with `not_found` if the record is deleted, trashed or hidden before ' +
      'the write lands, and with `conflict` if a reference field left out changes meanwhile; nothing changes then.'
    : '';
  return `${meta.summary}. ${resourceDescription}${update} ${scope} Pass \`${IDEMPOTENCY_ARGUMENT}\` to make retries safe.`.replace(/\s+/g, ' ');
}

/**
 * The tool result for a v1 API response: its JSON body as structured
 * content, or a tool error that keeps the problem's code, its detail as the
 * message and its other members (such as `errors`) with the status as details.
 * The error is thrown as a plain `{ code, message, details }` object, which
 * reaches the client with its code; an Error's would be withheld.
 */
async function toolResult(response: Response): Promise<CallToolResult> {
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (response.ok && body !== null && typeof body === 'object' && !Array.isArray(body)) {
    return structuredResult(body);
  }
  const problem = body !== null && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const retryAfter = response.headers.get('retry-after');
  throw {
    code: typeof problem.code === 'string' ? problem.code : 'api_error',
    message: typeof problem.detail === 'string' ? problem.detail : `The API answered ${response.status}.`,
    details: {
      status: response.status,
      ...Object.fromEntries(Object.entries(problem).filter(([member]) => !PROBLEM_MEMBERS.has(member))),
      ...(retryAfter ? { retryAfter } : {})
    }
  };
}
