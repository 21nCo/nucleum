import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthFnSession } from 'authfn';
import type { DatafnPublicLinkPrincipal } from '@datafn/server';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { resolveSyncRateLimitKey, type SyncContext } from './server.js';

const base = 'http://127.0.0.1:8787';
const json = { 'content-type': 'application/json' };
const clientIpHeader = 'x-test-client-ip';
/** The default DataFn query limit per bucket and minute. */
const QUERY_LIMIT = 120;

type Headers = Record<string, string>;

let harness: AccountTestHarness;
let owner: Headers;
let linkToken: string;

async function post(path: string, headers: Headers, body: unknown): Promise<Response> {
  return await harness.app.request(new URL(path, base).href, {
    method: 'POST',
    headers: { ...json, ...headers },
    body: JSON.stringify(body)
  });
}

/** Signs up a throwaway owner with a password generated at runtime and returns its session headers. */
async function signUpOwner(): Promise<Headers> {
  const response = await post('/auth/sign-up/password', { origin: base }, {
    email: 'rate-limit-owner@example.test',
    password: `${randomUUID().toUpperCase()}-${randomUUID()}!`,
    sessionMode: 'hybrid'
  });
  expect(response.status).toBe(200);
  const cookies = new Map(response.headers.getSetCookie().map((header) => {
    const pair = header.split(';', 1)[0];
    const separator = pair.indexOf('=');
    return [pair.slice(0, separator), pair.slice(separator + 1)] as const;
  }));
  const csrf = cookies.get('nucleus.csrf');
  expect(csrf).toBeTruthy();
  return {
    cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
    'x-authfn-csrf': csrf ?? '',
    origin: base
  };
}

const sharedId = 'objective:rate-limit-shared';
const objectiveQuery = { resource: 'objective', version: 1, filters: { id: { eq: sharedId } } };

/** Sends queries until one is rate limited; returns how many were let through. */
async function exhaustQueries(headers: Headers): Promise<number> {
  for (let sent = 0; sent <= QUERY_LIMIT; sent += 1) {
    const response = await post('/datafn/query', headers, objectiveQuery);
    if (response.status === 429) return sent;
  }
  throw new Error(`no query was rate limited after ${QUERY_LIMIT + 1} requests`);
}

beforeAll(async () => {
  harness = createAccountTestHarness({
    resolveClientIp: (request) => request.headers.get(clientIpHeader) ?? undefined
  });
  owner = await signUpOwner();
  const seeded = await post('/datafn/mutation', owner, [{
    resource: 'objective',
    version: 1,
    operation: 'insert',
    id: sharedId,
    record: { label: 'Shared goal', type: 'goal', status: 'active' },
    clientId: 'rate-limit-test',
    mutationId: 'rate-limit-test-1'
  }]);
  expect(seeded.status).toBe(200);
  const link = await post('/datafn/public-links', owner, {
    resource: 'objective',
    recordId: sharedId,
    scope: 'record',
    level: 'viewer'
  });
  expect(link.status).toBe(200);
  const body = await link.json() as { token?: string; result?: { token?: string } };
  linkToken = body.result?.token ?? body.token ?? '';
  expect(linkToken).toBeTruthy();
});

afterAll(async () => {
  await harness.reset();
});

describe('DataFn rate limit buckets', () => {
  /**
   * DataFn counts requests in fixed wall-clock windows. Freezing the clock just
   * after the next minute starts keeps a run inside one window.
   */
  beforeAll(() => {
    const minute = 60_000;
    vi.useFakeTimers({
      toFake: ['Date'],
      now: (Math.floor(Date.now() / minute) + 1) * minute + 1_000
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('does not lock the link owner out when public-link traffic hits the limit', async () => {
    const viewer = { 'x-datafn-public-link-token': linkToken, [clientIpHeader]: '192.0.2.10' };
    expect((await post('/datafn/query', viewer, objectiveQuery)).status).toBe(200);
    expect(await exhaustQueries(viewer)).toBe(QUERY_LIMIT - 1);

    const ownQuery = await post('/datafn/query', owner, objectiveQuery);
    expect(ownQuery.status).toBe(200);
  });

  it('limits unauthenticated requests per client IP', async () => {
    const first = { [clientIpHeader]: '192.0.2.20' };
    expect(await exhaustQueries(first)).toBe(QUERY_LIMIT);

    const other = await post('/datafn/query', { [clientIpHeader]: '192.0.2.21' }, objectiveQuery);
    expect(other.status).not.toBe(429);
  });
});

describe('resolveSyncRateLimitKey', () => {
  const request = new Request(`${base}/datafn/query`, { method: 'POST' });
  const publicLink = {
    linkId: 'link-test-1',
    namespace: 'user:test-owner'
  } as DatafnPublicLinkPrincipal;
  const session = { actorId: 'test-user' } as AuthFnSession;

  function context(input: Partial<SyncContext>): SyncContext {
    return { request, session: null, publicLink: null, ...input };
  }

  it('keys a public-link request on the link, not the owner namespace', async () => {
    expect(await resolveSyncRateLimitKey(context({ publicLink }), () => '192.0.2.30'))
      .toBe('public_link:link-test-1');
  });

  it('keys a signed-in request on the user namespace', async () => {
    expect(await resolveSyncRateLimitKey(context({ session }), () => '192.0.2.30'))
      .toBe('user:test-user');
  });

  it('keys other requests on the client IP, or one anonymous bucket without it', async () => {
    expect(await resolveSyncRateLimitKey(context({}), () => ' 192.0.2.30 ')).toBe('ip:192.0.2.30');
    expect(await resolveSyncRateLimitKey(context({}), async () => '192.0.2.31')).toBe('ip:192.0.2.31');
    expect(await resolveSyncRateLimitKey(context({}), () => undefined)).toBe('anonymous');
    expect(await resolveSyncRateLimitKey(context({}))).toBe('anonymous');
  });
});
