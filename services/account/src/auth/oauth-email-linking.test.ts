import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OAUTH_EMAIL_LINKING_PROVIDERS, withOAuthEmailLinkingPolicy } from '../auth.js';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { ACCOUNT_AUTH_NAMESPACE } from './constants.js';

const authority = 'http://127.0.0.1:18788';
const email = 'existing-user@example.test';

describe('OAuth sign-in linking by verified email', () => {
  let harness: AccountTestHarness;

  beforeEach(() => {
    harness = createAccountTestHarness({ authority, enableRateLimit: false });
  });

  afterEach(async () => {
    await harness.reset();
  });

  it('allows linking by verified email for Google only', () => {
    expect([...OAUTH_EMAIL_LINKING_PROVIDERS]).toEqual(['google']);
  });

  it('keeps Apple out of email linking until @authfn/social-oauth 0.1.8 or later is installed', () => {
    const version = installedSocialOAuthVersion();
    const fixed = compareVersions(version, '0.1.8') >= 0;
    expect(
      fixed,
      `@authfn/social-oauth ${version} is installed. Once it is 0.1.8 or later, decide whether to add "apple" back to OAUTH_EMAIL_LINKING_PROVIDERS and update this test.`
    ).toBe(false);
    expect([...OAUTH_EMAIL_LINKING_PROVIDERS]).not.toContain('apple');
  });

  it('compares versions so the guard trips at the stable 0.1.8 release', () => {
    expect(compareVersions('0.1.7', '0.1.8')).toBeLessThan(0);
    expect(compareVersions('0.1.8-rc.1', '0.1.8')).toBeLessThan(0);
    expect(compareVersions('0.1.8', '0.1.8')).toBe(0);
    expect(compareVersions('0.1.8+build.1', '0.1.8')).toBe(0);
    expect(compareVersions('0.2.0', '0.1.8')).toBeGreaterThan(0);
  });

  it('turns off a provider-level linkByVerifiedEmail for providers outside the policy', () => {
    const providers = withOAuthEmailLinkingPolicy({
      google: { clientId: 'test-google-client', linkByVerifiedEmail: true },
      apple: { clientId: 'test-apple-client', linkByVerifiedEmail: true }
    });
    expect(providers.apple?.linkByVerifiedEmail).toBe(false);
    expect(providers.google?.linkByVerifiedEmail).toBe(true);
    expect(withOAuthEmailLinkingPolicy({ apple: undefined }).apple).toBeUndefined();
  });

  it('refuses to attach an Apple sign-in to an existing account with the same verified email', async () => {
    const existingUserId = await createVerifiedUser(email);
    harness.oauth.setUser('apple', 'apple-same-email', {
      providerAccountId: 'apple-same-email-sub',
      email,
      emailVerified: true
    });

    const callback = await oauthCallback('apple', 'apple-same-email');
    expect(callback.status).toBe(409);
    const failure = await callback.json() as { ok?: boolean; error?: { code?: string } };
    expect(failure.ok).toBe(false);
    expect(failure.error?.code).toBe('AUTHFN_CONFLICT');

    expect(await oauthAccountFor('apple', 'apple-same-email-sub')).toBeNull();
    const users = await usersByEmail(email);
    expect(users.map((user) => user.id)).toEqual([existingUserId]);
  });

  it('still links a Google sign-in to an existing account with the same verified email', async () => {
    const existingUserId = await createVerifiedUser(email);
    harness.oauth.setUser('google', 'google-same-email', {
      providerAccountId: 'google-same-email-sub',
      email,
      emailVerified: true
    });

    const callback = await oauthCallback('google', 'google-same-email');
    expect(callback.status).toBe(200);
    const body = await callback.json() as { data?: { session?: { actorId?: string } } };
    expect(body.data?.session?.actorId).toBe(existingUserId);
    expect((await oauthAccountFor('google', 'google-same-email-sub'))?.userId).toBe(existingUserId);
  });

  it('keeps signing in an Apple ID that is already linked to an account', async () => {
    harness.oauth.setUser('apple', 'apple-linked', {
      providerAccountId: 'apple-linked-sub',
      email: 'apple-linked@example.test',
      emailVerified: true
    });

    const first = await oauthCallback('apple', 'apple-linked');
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { data?: { session?: { actorId?: string } } };
    const userId = firstBody.data?.session?.actorId;
    expect(userId).toBeTruthy();

    const again = await oauthCallback('apple', 'apple-linked');
    expect(again.status).toBe(200);
    const againBody = await again.json() as { data?: { session?: { actorId?: string } } };
    expect(againBody.data?.session?.actorId).toBe(userId);
  });

  async function createVerifiedUser(address: string): Promise<string> {
    await post('/auth/otp/send', { purpose: 'sign-up', email: address });
    const message = harness.delivery.latest(address);
    expect(message).toBeTruthy();
    const verified = await post('/auth/otp/verify', {
      purpose: 'sign-up',
      email: address,
      code: message!.code,
      sessionMode: 'bearer'
    });
    const actorId = (verified.data?.session as { actorId?: string } | undefined)?.actorId;
    expect(actorId).toBeTruthy();
    return actorId!;
  }

  async function oauthCallback(provider: 'google' | 'apple', code: string): Promise<Response> {
    const started = await post('/auth/social/start', { provider });
    const stateId = started.data?.stateId;
    expect(typeof stateId).toBe('string');
    return harness.app.fetch(new Request(
      `${authority}/auth/social/callback/${provider}?code=${code}&state=${encodeURIComponent(String(stateId))}`
    ));
  }

  async function post(path: string, body: Record<string, unknown>) {
    const response = await harness.app.fetch(new Request(`${authority}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }));
    const payload = await response.json() as { ok: boolean; data?: Record<string, unknown>; error?: unknown };
    expect(payload.ok, JSON.stringify(payload.error)).toBe(true);
    return payload;
  }

  async function oauthAccountFor(provider: 'google' | 'apple', providerAccountId: string) {
    return harness.database.findOne<Record<string, unknown>>({
      model: 'oauth_accounts',
      where: [
        { field: 'provider', operator: 'eq', value: provider },
        { field: 'providerAccountId', operator: 'eq', value: providerAccountId }
      ],
      namespace: ACCOUNT_AUTH_NAMESPACE
    });
  }

  async function usersByEmail(address: string) {
    return harness.database.findMany({
      model: 'users',
      where: [{ field: 'primaryEmail', operator: 'eq', value: address }],
      namespace: ACCOUNT_AUTH_NAMESPACE
    }) as Promise<Record<string, unknown>[]>;
  }
});

function installedSocialOAuthVersion(): string {
  const require = createRequire(import.meta.url);
  let directory = dirname(require.resolve('@authfn/social-oauth'));
  for (;;) {
    const manifestPath = join(directory, 'package.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string; version?: string };
      if (manifest.name === '@authfn/social-oauth' && manifest.version) {
        return manifest.version;
      }
    }
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error('Could not find the installed @authfn/social-oauth package.json');
    }
    directory = parent;
  }
}

function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) {
      return a.core[index] - b.core[index];
    }
  }
  if (a.prerelease === b.prerelease) {
    return 0;
  }
  if (a.prerelease === undefined) {
    return 1;
  }
  if (b.prerelease === undefined) {
    return -1;
  }
  return a.prerelease < b.prerelease ? -1 : 1;
}

function parseVersion(version: string): { core: number[]; prerelease?: string } {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+.*)?$/.exec(version);
  if (!match) {
    throw new Error(`Unrecognised version ${version}`);
  }
  return { core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: match[4] };
}
