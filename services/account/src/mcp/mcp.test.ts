import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { AuthFnError } from 'authfn';
import { McpFnTestClient, assertManifestContract, authenticatedHttpTarget } from '@mcpfn/testing';
import { assertAuthRegressionSuite, createFetchAuthTarget, type McpFnAuthCredential } from '@mcpfn/testing/auth';
import { interfaceApps, interfaceContract, type InterfaceApp } from '@nucleum/schema/interfaces';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import type { InterfaceApiServices } from '../api/router.js';
import { readManifest } from './manifests.js';
import { registerInterfaceMcpRoutes } from './routes.js';
import { SCOPES_METADATA } from './tools.js';

const base = 'http://127.0.0.1:8787';

type Headers = Record<string, string>;
type Body = Record<string, unknown>;

interface ToolResult {
  isError?: boolean;
  structuredContent?: Body;
  content?: { type: string; text?: string }[];
}

let harness: AccountTestHarness;
let cookie: Headers;
const keyIds = new Map<string, string>();

const fetchApp = (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
  Promise.resolve(harness.app.fetch(new Request(input, init)));

async function call(path: string, headers: Headers, init: { method?: string; body?: unknown } = {}): Promise<Response> {
  return harness.app.fetch(new Request(`${base}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: { 'content-type': 'application/json', ...headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  }));
}

/** Builds a throwaway sign-up credential at runtime that meets the password policy. */
function generateCredential(): string {
  return [randomUUID().toUpperCase(), randomUUID(), '!'].join('');
}

async function signUp(email: string): Promise<Headers> {
  const response = await call('/auth/sign-up/password', { origin: base }, {
    body: { email, password: generateCredential(), sessionMode: 'hybrid' }
  });
  expect(response.status).toBe(200);
  const cookies = response.headers.getSetCookie().map((entry) => entry.split(';')[0]);
  const csrf = cookies.find((entry) => entry.startsWith('nucleus.csrf='))?.split('=')[1] ?? '';
  expect(csrf).toBeTruthy();
  return { cookie: cookies.join('; '), 'x-authfn-csrf': csrf, origin: base };
}

async function createKey(scopes: string[]): Promise<Headers> {
  const response = await call('/auth/api-keys', cookie, { body: { name: scopes.join(' ') || 'none', scopes } });
  expect(response.status).toBe(201);
  const { data } = await response.json() as { data: { secret: string; keyId: string } };
  const headers = { authorization: `Bearer ${data.secret}` };
  keyIds.set(headers.authorization, data.keyId);
  return headers;
}

async function connect(app: InterfaceApp, headers: Headers): Promise<McpFnTestClient> {
  return McpFnTestClient.connectTarget(authenticatedHttpTarget(`${base}/mcp/${app}`, {
    credential: { kind: 'api-key', headers },
    fetch: fetchApp
  }));
}

async function withClient<T>(app: InterfaceApp, headers: Headers, run: (client: McpFnTestClient) => Promise<T>): Promise<T> {
  const client = await connect(app, headers);
  try {
    return await run(client);
  } finally {
    await client.close();
  }
}

async function ok(client: McpFnTestClient, tool: string, args: Body): Promise<Body> {
  const result = await client.callTool(tool, args) as ToolResult;
  expect(result.isError, JSON.stringify(result)).not.toBe(true);
  return result.structuredContent ?? {};
}

/** The `{ code, message, details }` error of a failed tool call, with its text and structured forms equal. */
async function failure(client: McpFnTestClient, tool: string, args: Body): Promise<Body> {
  const result = await client.callTool(tool, args) as ToolResult;
  expect(result.isError, JSON.stringify(result)).toBe(true);
  const text = JSON.parse(result.content?.find((block) => block.type === 'text')?.text ?? '{}') as Body;
  expect(result.structuredContent).toEqual(text);
  expect(text.ok).toBe(false);
  return text.error as Body;
}

/** Tool names of an app's checked-in manifest, all of them or only those a read scope reaches. */
function manifestTools(app: InterfaceApp, access: 'read' | 'write'): string[] {
  return readManifest(app).tools
    .filter((tool) => access === 'write' ||
      (tool.metadata?.[SCOPES_METADATA] as string[] | undefined)?.length === 1)
    .map((tool) => tool.name)
    .sort();
}

/**
 * One create and update each app's round trip exercises. Pointron's update
 * expects the completion time the v1 write derives, which a direct DataFn
 * write would leave unset.
 */
const roundTrips: Record<InterfaceApp, {
  resource: string;
  create: Body;
  update: Body;
  expectUpdated: Body;
}> = {
  memotron: {
    resource: 'node',
    create: { label: 'MCP note', contentType: 'SIMPLE_TEXT' },
    update: { label: 'MCP note, renamed', isStarred: true },
    expectUpdated: { label: 'MCP note, renamed', isStarred: true }
  },
  pointron: {
    resource: 'task',
    create: { label: 'MCP task', dateUnix: 1_700_000_000_000 },
    update: { isChecked: true },
    expectUpdated: { label: 'MCP task', isChecked: true, completedAtUnix: expect.any(Number) }
  },
  nucleum: {
    resource: 'space',
    create: { label: 'MCP space', description: 'Made over MCP' },
    update: { description: 'Changed over MCP' },
    expectUpdated: { label: 'MCP space', description: 'Changed over MCP' }
  }
};

const plural = (resource: string) => (resource.endsWith('y') ? `${resource.slice(0, -1)}ies` : `${resource}s`);

beforeAll(async () => {
  harness = createAccountTestHarness({ enableRateLimit: false });
  cookie = await signUp('mcp-servers@example.test');
});

describe.each(interfaceApps)('/mcp/%s', (app) => {
  const { read, write } = interfaceContract[app].scopes;

  it('refuses a missing, invalid, revoked or out-of-scope token and accepts one with the read scope', async () => {
    const results = await assertAuthRegressionSuite({
      kind: 'api-key',
      target: createFetchAuthTarget({ url: `${base}/mcp/${app}`, fetch: fetchApp }),
      requiredScopes: [read],
      provider: {
        capabilities: { scopes: true, revocation: true },
        issue: async ({ scopes }) => ({ kind: 'api-key', headers: await createKey(scopes ?? [read]) }),
        revoke: async (credential: McpFnAuthCredential) => {
          const authorization = new Headers(credential.headers).get('authorization') ?? '';
          const response = await call(`/auth/api-keys/${encodeURIComponent(keyIds.get(authorization) ?? '')}`,
            cookie, { method: 'DELETE' });
          expect(response.status).toBe(200);
        }
      }
    });
    expect(results.map((result) => result.name)).toEqual([
      'missing-credential',
      'invalid-credential',
      'valid-credential',
      'insufficient-scope',
      'revoked-credential'
    ]);
  });

  it('answers 401 with a Bearer challenge without a token, and for a cookie session alone', async () => {
    for (const headers of [{}, cookie]) {
      const response = await call(`/mcp/${app}`, { accept: 'application/json, text/event-stream', ...headers }, {
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
      });
      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toBe(`Bearer realm="${app}"`);
      expect(await response.json()).toMatchObject({ status: 401, code: 'unauthenticated' });
    }
  });

  it('answers 405 with Allow: POST to every method but POST, opening no stream, and still serves POST', async () => {
    const token = await createKey([read]);
    for (const method of ['GET', 'DELETE', 'PUT', 'PATCH']) {
      for (const headers of [token, {}]) {
        const response = await call(`/mcp/${app}`, { accept: 'application/json, text/event-stream', ...headers }, { method });
        expect(response.status).toBe(405);
        expect(response.headers.get('allow')).toBe('POST');
        expect(response.headers.get('content-type')).not.toContain('text/event-stream');
        expect(await response.json()).toMatchObject({ status: 405, code: 'method_not_allowed' });
      }
    }
    const tools = await withClient(app, token, (client) => client.listTools());
    expect(tools.map((tool) => tool.name).sort()).toEqual(manifestTools(app, 'read'));
  });

  it('answers 403 insufficient_scope with the needed scope for a token without this app\'s read scope', async () => {
    const other = app === 'memotron' ? 'pointron' : 'memotron';
    const response = await call(`/mcp/${app}`, {
      accept: 'application/json, text/event-stream',
      ...await createKey([`${other}:read`, `${other}:write`])
    }, { body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } });
    expect(response.status).toBe(403);
    expect(response.headers.get('www-authenticate'))
      .toBe(`Bearer realm="${app}", error="insufficient_scope", scope="${read}"`);
    expect(await response.json()).toMatchObject({ code: 'insufficient_scope', scopes: [read] });
  });

  it('lists only the read tools to a read token and every manifest tool to a write token', async () => {
    const readTools = manifestTools(app, 'read');
    expect(readTools.length).toBeGreaterThan(0);
    expect(readTools.every((name) => /^(list|get)_|^search$/.test(name))).toBe(true);
    await withClient(app, await createKey([read]), (client) =>
      assertManifestContract(client, readManifest(app), { expectedToolNames: readTools }));
    const writeKey = await createKey([read, write]);
    const tools = await withClient(app, writeKey, (client) => assertManifestContract(client, readManifest(app)));
    expect(tools.map((tool) => tool.name).sort()).toEqual(manifestTools(app, 'write'));
    expect(tools.some((tool) => /^(delete|bulk)_|_bulk$/.test(tool.name))).toBe(false);
  });

  it('refuses a write tool to a read token with insufficient_scope and writes nothing', async () => {
    const { resource, create } = roundTrips[app];
    await withClient(app, await createKey([read]), async (client) => {
      const before = await ok(client, `list_${plural(resource)}`, {});
      const denied = await failure(client, `create_${resource}`, create);
      expect(denied).toMatchObject({
        code: 'insufficient_scope',
        details: { requiredScopes: [read, write], missingScopes: [write] }
      });
      expect(await ok(client, `list_${plural(resource)}`, {})).toEqual(before);
    });
  });

  it('creates and updates a record, replays a keyed create, and reads back the result', async () => {
    const { resource, create, update, expectUpdated } = roundTrips[app];
    await withClient(app, await createKey([read, write]), async (client) => {
      const idempotencyKey = `mcp-${app}-${randomUUID()}`;
      const created = await ok(client, `create_${resource}`, { ...create, idempotencyKey });
      expect(created).toMatchObject(create);
      const id = String(created.id);
      expect(id.startsWith(`${resource}:`)).toBe(true);
      expect(await ok(client, `create_${resource}`, { ...create, idempotencyKey })).toMatchObject({ id });
      expect(await failure(client, `create_${resource}`, { ...create, label: 'Another body', idempotencyKey }))
        .toMatchObject({ code: 'idempotency_key_reused', details: { status: 422 } });

      expect(await ok(client, `get_${resource}`, { id })).toMatchObject({ id, ...create });
      const updated = await ok(client, `update_${resource}`, { id, ...update });
      expect(updated).toMatchObject({ id, ...expectUpdated });
      expect(await ok(client, `get_${resource}`, { id })).toMatchObject({ id, ...expectUpdated });
      const listed = await ok(client, `list_${plural(resource)}`, {});
      expect((listed.data as Body[]).map((row) => row.id)).toContain(id);
    });
  });

  it('answers the API\'s problems as tool errors that keep their code and details', async () => {
    const { resource } = roundTrips[app];
    await withClient(app, await createKey([read, write]), async (client) => {
      expect(await failure(client, `get_${resource}`, { id: `${resource}:missing` }))
        .toMatchObject({ code: 'not_found', details: { status: 404 } });
      expect(await failure(client, `update_${resource}`, { id: `${resource}:missing`, label: 'x' }))
        .toMatchObject({ code: 'not_found', details: { status: 404 } });
      const created = await ok(client, `create_${resource}`, roundTrips[app].create);
      const invalid = await failure(client, `update_${resource}`, { id: created.id });
      expect(invalid).toMatchObject({ code: 'validation_failed', details: { status: 422 } });
      expect((invalid.details as Body).errors).toEqual([{ pointer: '', detail: 'The body must set at least one field.' }]);
    });
  });

  it('answers not_found for an id that URL parsing would move off the record route, and writes nothing', async () => {
    const { resource, create, update } = roundTrips[app];
    await withClient(app, await createKey([read, write]), async (client) => {
      await ok(client, `create_${resource}`, create);
      const before = await ok(client, `list_${plural(resource)}`, {});
      for (const id of ['.', '..', '\ud800']) {
        for (const [tool, args] of [[`get_${resource}`, { id }], [`update_${resource}`, { id, ...update }]] as const) {
          expect(await failure(client, tool, args), `${tool} ${JSON.stringify(id)}`).toEqual({
            code: 'not_found',
            message: `No ${resource} ${id} is visible to this token.`,
            details: { status: 404 }
          });
        }
      }
      expect(await ok(client, `list_${plural(resource)}`, {})).toEqual(before);
    });
  });
});

describe('/mcp browser origins', () => {
  const trusted = 'https://memotron.example.test';
  let originHarness: AccountTestHarness;
  let token: Headers;

  /** Runs `run` with the shared helpers aimed at a harness whose CORS list holds `trusted`. */
  async function onOriginHarness<T>(run: () => Promise<T>): Promise<T> {
    const previous = { harness, cookie };
    harness = originHarness;
    try {
      return await run();
    } finally {
      ({ harness, cookie } = previous);
    }
  }

  const listTools = (origin?: string) => originHarness.app.fetch(new Request(`${base}/mcp/memotron`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...token,
      ...(origin ? { origin } : {})
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
  }));

  /** Lists the tools over a full MCP session whose every request carries `origin`. */
  const listToolsFrom = (origin: string) => McpFnTestClient.connectTarget(authenticatedHttpTarget(`${base}/mcp/memotron`, {
    credential: { kind: 'api-key', headers: token },
    fetch: (input, init) => {
      const request = new Request(input, init);
      const headers = new globalThis.Headers(request.headers);
      headers.set('origin', origin);
      return Promise.resolve(originHarness.app.fetch(new Request(request, { headers })));
    }
  })).then(async (client) => {
    try {
      return (await client.listTools()).map((tool) => tool.name).sort();
    } finally {
      await client.close();
    }
  });

  beforeAll(async () => {
    originHarness = createAccountTestHarness({ enableRateLimit: false, corsOrigins: [base, trusted] });
    token = await onOriginHarness(async () => {
      cookie = await signUp('mcp-origins@example.test');
      return createKey([interfaceContract.memotron.scopes.read]);
    });
  });

  it('serves a request from an origin the account allows, including the native embed origin', async () => {
    for (const origin of [trusted, 'tauri://localhost']) {
      expect(await listToolsFrom(origin)).toEqual(manifestTools('memotron', 'read'));
    }
  });

  it('lets a browser on an allowed origin send the MCP headers after preflight', async () => {
    const preflight = await originHarness.app.fetch(new Request(`${base}/mcp/memotron`, {
      method: 'OPTIONS',
      headers: {
        origin: trusted,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type,mcp-protocol-version'
      }
    }));
    expect(preflight.status).toBeLessThan(300);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(trusted);
    const allowed = (preflight.headers.get('access-control-allow-headers') ?? '').toLowerCase().split(',');
    expect(allowed).toEqual(expect.arrayContaining(['authorization', 'content-type', 'mcp-protocol-version']));
  });

  it('answers 403 to a request from an origin the account does not allow, with a valid token', async () => {
    const response = await listTools('https://untrusted.example.test');
    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).toContain('Origin not allowed');
  });

  it('serves a request without an Origin, as native MCP clients send', async () => {
    const response = await listTools();
    expect(response.status).toBe(200);
    expect(((await response.json()) as { result?: { tools?: unknown[] } }).result?.tools?.length)
      .toBe(manifestTools('memotron', 'read').length);
  });
});

describe('/mcp failures outside a tool', () => {
  /** An app serving only the MCP routes, whose token check fails with `failure`. */
  function failingApp(failure: Error): { app: Hono; logError: ReturnType<typeof vi.fn> } {
    const app = new Hono();
    const logError = vi.fn();
    const services = {
      authenticate: () => { throw failure; },
      getSyncServer: () => Promise.reject(new Error('The MCP route must not reach the sync server.')),
      logError
    } as unknown as InterfaceApiServices;
    registerInterfaceMcpRoutes({ app, services });
    return { app, logError };
  }

  const listTools = (app: Hono) => app.fetch(new Request(`${base}/mcp/memotron`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: 'Bearer test-mcp-token'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
  }));

  it('answers an authfn client error such as a rate limit with its status and code, as the v1 API does', async () => {
    const { app, logError } = failingApp(new AuthFnError('AUTHFN_RATE_LIMITED', 'Too many requests.', { status: 429 }));
    const response = await listTools(app);
    expect(response.status).toBe(429);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({ status: 429, code: 'authfn_rate_limited', detail: 'Too many requests.' });
    expect(logError).not.toHaveBeenCalled();
  });

  it('answers a GET with 405 before checking the token', async () => {
    const { app, logError } = failingApp(new TypeError('The token check must not run for a GET.'));
    const response = await app.fetch(new Request(`${base}/mcp/memotron`, {
      headers: { accept: 'text/event-stream', authorization: 'Bearer test-mcp-token' }
    }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(logError).not.toHaveBeenCalled();
  });

  it('answers an unexpected failure with a 500 problem that withholds its message and logs only its class', async () => {
    const { app, logError } = failingApp(new TypeError('stored note text'));
    const response = await listTools(app);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ status: 500, code: 'internal' });
    expect(text).not.toContain('stored note text');
    expect(logError).toHaveBeenCalledWith('MCP memotron request failed', { name: 'TypeError' });
    expect(JSON.stringify(logError.mock.calls)).not.toContain('stored note text');
  });
});

describe('/mcp shared resources and tokens across apps', () => {
  it('serves every app to a nucleum token and no app server to a token of another app', async () => {
    const nucleum = await createKey(['nucleum:*']);
    for (const app of interfaceApps) {
      const tools = await withClient(app, nucleum, (client) => client.listTools());
      expect(tools.map((tool) => tool.name).sort()).toEqual(manifestTools(app, 'write'));
    }
    const response = await call('/mcp/nucleum', {
      accept: 'application/json, text/event-stream',
      ...await createKey(['memotron:*', 'pointron:*'])
    }, { body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } });
    expect(response.status).toBe(403);
  });

  it('keeps collections of another app\'s types out of an app\'s lists and creates', async () => {
    const nucleum = await createKey(['nucleum:*']);
    const goals = await withClient('nucleum', nucleum, (client) =>
      ok(client, 'create_collection', { label: 'Goals', type: 'list', resource: 'objective' }));
    await withClient('memotron', await createKey(['memotron:*']), async (client) => {
      const notes = await ok(client, 'create_collection', { label: 'Notes', type: 'list', resource: 'node' });
      const listed = ((await ok(client, 'list_collections', {})).data as Body[]).map((row) => row.id);
      expect(listed).toContain(notes.id);
      expect(listed).not.toContain(goals.id);
      expect(await failure(client, 'get_collection', { id: goals.id })).toMatchObject({ code: 'not_found' });
      expect(await failure(client, 'create_collection', { label: 'Goals', type: 'list', resource: 'objective' }))
        .toMatchObject({ code: 'MCPFN_INVALID_ARGUMENTS' });
    });
  });

  it('answers 404 for a path that names no app', async () => {
    const response = await call('/mcp/timear', await createKey(['nucleum:*']), {
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
    });
    expect(response.status).toBe(404);
  });
});
