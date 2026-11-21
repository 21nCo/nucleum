import { createHash, randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { ACCOUNT_API_KEY_POLICY, ACCOUNT_SOCIAL_OAUTH_POLICY } from './plugins.js';

const base = 'http://127.0.0.1:8787';
const json = { 'content-type': 'application/json' };
const DAY_MS = 24 * 60 * 60 * 1000;

type Headers = Record<string, string>;

let harness: AccountTestHarness;

async function call(path: string, headers: Headers, body?: unknown, method?: string): Promise<Response> {
  return harness.app.fetch(new Request(`${base}${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { ...json, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual'
  }));
}

function cookiePairs(response: Response): string[] {
  return response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]);
}

/** Builds a throwaway sign-up credential at runtime that meets the password policy. */
function generateCredential(): string {
  return [randomUUID().toUpperCase(), randomUUID(), '!'].join('');
}

async function signUp(): Promise<Headers> {
  const response = await call('/auth/sign-up/password', { origin: base }, {
    email: `policy-${randomUUID()}@example.test`,
    password: generateCredential()
  });
  expect(response.status).toBe(200);
  const cookies = cookiePairs(response);
  const csrf = cookies.find((cookie) => cookie.startsWith('nucleus.csrf='))?.split('=')[1];
  return { cookie: cookies.join('; '), 'x-authfn-csrf': decodeURIComponent(csrf ?? ''), origin: base };
}

async function startGoogle(body: Record<string, unknown>): Promise<Response> {
  return call('/auth/social/start', { origin: base }, { provider: 'google', ...body });
}

beforeEach(async () => {
  harness?.reset && (await harness.reset());
  harness = createAccountTestHarness();
});

describe('account sign-in policy', () => {
  it('leaves the native-to-web handoff routes unregistered', async () => {
    const session = await signUp();
    const unknown = await call('/auth/not-a-route', session, {});
    const start = await call('/auth/handoff/web/start', session, { returnTo: '/' });
    const consume = await call('/auth/handoff/web/consume?code=test-handoff-code', {});

    for (const response of [start, consume]) {
      expect(response.status).toBe(unknown.status);
      const body = (await response.json()) as { ok: boolean; data?: unknown };
      expect(body.ok).toBe(false);
      expect(body.data).toBeUndefined();
    }
    const notFound = harness
      .logEvents()
      .map((event) => JSON.stringify(event))
      .filter((event) => event.includes('Route not found'));
    expect(notFound.some((event) => event.includes('/auth/handoff/web/start'))).toBe(true);
    expect(notFound.some((event) => event.includes('/auth/handoff/web/consume'))).toBe(true);
  });

  it('never sends a session token to a web return target', async () => {
    const response = await startGoogle({
      returnTo: `${base}/`,
      callbackMode: 'redirect',
      handoffMode: 'session-token'
    });

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'AUTHFN_VALIDATION_ERROR'
    );
  });

  it('keeps browser binding off so installed native builds can still sign in', async () => {
    expect(ACCOUNT_SOCIAL_OAUTH_POLICY.bindBrowserState).toBe(false);
    const start = await startGoogle({ returnTo: `${base}/`, callbackMode: 'redirect' });
    expect(start.status).toBe(200);
    expect(cookiePairs(start).some((cookie) => cookie.includes('.oauth_binding.'))).toBe(false);
    const { redirectTo } = ((await start.json()) as { data: { redirectTo: string } }).data;
    const state = new URL(redirectTo).searchParams.get('state') ?? '';

    const elsewhere = await call(
      `/auth/social/callback/google?state=${encodeURIComponent(state)}&code=policy-user`,
      {}
    );
    expect(elsewhere.status).toBe(303);
    expect(elsewhere.headers.getSetCookie().some((cookie) => cookie.startsWith('nucleus.session='))).toBe(true);
  });
});

describe('native social sign-in handoff', () => {
  it('returns a one-time code that only the verifier holder can exchange, once', async () => {
    const verifier = [randomUUID(), randomUUID()].join('-');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const start = await startGoogle({
      returnTo: 'nucleum://oauthsignin',
      callbackMode: 'redirect',
      handoffMode: 'session-token',
      handoffChallenge: challenge
    });
    expect(start.status).toBe(200);
    const { redirectTo } = ((await start.json()) as { data: { redirectTo: string } }).data;
    const state = new URL(redirectTo).searchParams.get('state') ?? '';

    const callback = await call(
      `/auth/social/callback/google?state=${encodeURIComponent(state)}&code=policy-user`,
      {}
    );
    expect(callback.status).toBe(303);
    const location = callback.headers.get('location') ?? '';
    expect(location.startsWith('nucleum://oauthsignin')).toBe(true);
    expect(callback.headers.getSetCookie().some((cookie) => cookie.startsWith('nucleus.session='))).toBe(false);
    const fragment = new URLSearchParams(location.split('#')[1] ?? '');
    expect(fragment.get('handoff')).toBe('code');
    const code = fragment.get('token') ?? '';
    expect(code.startsWith('shc_')).toBe(true);

    const exchange = (body: Record<string, string>) =>
      call('/auth/social/handoff/exchange', { origin: base }, body);
    const wrong = await exchange({ code, verifier: `${verifier}-other` });
    expect(wrong.status).toBeGreaterThanOrEqual(400);

    const exchanged = await exchange({ code, verifier });
    expect(exchanged.status).toBe(200);
    const data = ((await exchanged.json()) as {
      data: { session: { id: string }; handoff: { token: string; type: string } };
    }).data;
    expect(data.handoff.type).toBe('session-token');
    expect(data.handoff.token).toBeTruthy();
    expect(data.session.id).toBeTruthy();

    const session = await call('/auth/session', { authorization: `Bearer ${data.handoff.token}` });
    expect(session.status).toBe(200);

    const replay = await exchange({ code, verifier });
    expect(replay.status).toBeGreaterThanOrEqual(400);
  });
});

describe('account access token policy', () => {
  it('gives a token without an expiry the default lifetime and refuses longer than the maximum', async () => {
    const session = await signUp();
    const before = Date.now();

    const created = await call('/auth/api-keys', session, { name: 'default', scopes: ['nucleum:read'] });
    expect(created.status).toBe(201);
    const listed = await call('/auth/api-keys', session);
    const keys = ((await listed.json()) as { data: { keys: { expiresAt: string | null }[] } }).data.keys;
    const expiresAt = new Date(keys[0]?.expiresAt ?? 0).getTime();
    const expected = before + ACCOUNT_API_KEY_POLICY.defaultExpiresInSeconds * 1000;
    expect(Math.abs(expiresAt - expected)).toBeLessThan(60_000);

    const tooLong = await call('/auth/api-keys', session, {
      name: 'too long',
      scopes: ['nucleum:read'],
      expiresAt: new Date(Date.now() + 400 * DAY_MS).toISOString()
    });
    expect(tooLong.status).toBe(400);

    const yearLong = await call('/auth/api-keys', session, {
      name: 'a year',
      scopes: ['nucleum:read'],
      expiresAt: new Date(Date.now() + 365 * DAY_MS).toISOString()
    });
    expect(yearLong.status).toBe(201);
  });
});
