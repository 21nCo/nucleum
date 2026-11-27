import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OAUTH_EMAIL_LINKING_PROVIDERS, withOAuthEmailLinkingPolicy } from '../auth.js';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { ACCOUNT_AUTH_NAMESPACE } from './constants.js';

const authority = 'http://127.0.0.1:18788';
const email = 'existing-user@example.test';
/**
 * First @authfn/social-oauth release that takes the Apple email only from the
 * verified identity token. 0.2.0 creates new accounts with the email from the
 * unsigned `user` field of the Apple callback, marked verified; 0.2.1 failed to
 * build and was never published. The account service must not run anything
 * older than 0.2.2.
 */
const FIRST_FIXED_SOCIAL_OAUTH = '0.2.2';

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

  it(`runs @authfn/social-oauth ${FIRST_FIXED_SOCIAL_OAUTH} or later, which takes the Apple email only from the verified identity token`, () => {
    const version = installedSocialOAuthVersion();
    expect(
      compareVersions(version, FIRST_FIXED_SOCIAL_OAUTH),
      `@authfn/social-oauth ${version} is installed. Releases before ${FIRST_FIXED_SOCIAL_OAUTH} create Apple accounts with an unsigned, caller-chosen email marked verified.`
    ).toBeGreaterThanOrEqual(0);
  });

  it('keeps Apple out of email linking', () => {
    expect([...OAUTH_EMAIL_LINKING_PROVIDERS]).not.toContain('apple');
  });

  it(`compares versions so the floor holds at the stable ${FIRST_FIXED_SOCIAL_OAUTH} release`, () => {
    expect(compareVersions('0.1.8', FIRST_FIXED_SOCIAL_OAUTH)).toBeLessThan(0);
    expect(compareVersions('0.2.0', FIRST_FIXED_SOCIAL_OAUTH)).toBeLessThan(0);
    expect(compareVersions('0.2.1', FIRST_FIXED_SOCIAL_OAUTH)).toBeLessThan(0);
    expect(compareVersions('0.2.2-rc.1', FIRST_FIXED_SOCIAL_OAUTH)).toBeLessThan(0);
    expect(compareVersions('0.2.2-rc.2', '0.2.2-rc.10')).toBeLessThan(0);
    expect(compareVersions('0.2.2-rc.1', '0.2.2-rc')).toBeGreaterThan(0);
    expect(compareVersions('0.2.2-1', '0.2.2-alpha')).toBeLessThan(0);
    expect(compareVersions('0.2.2', FIRST_FIXED_SOCIAL_OAUTH)).toBe(0);
    expect(compareVersions('0.2.2+build.1', FIRST_FIXED_SOCIAL_OAUTH)).toBe(0);
    expect(compareVersions('0.2.3', FIRST_FIXED_SOCIAL_OAUTH)).toBeGreaterThan(0);
    expect(compareVersions('0.3.0', FIRST_FIXED_SOCIAL_OAUTH)).toBeGreaterThan(0);
    expect(compareVersions('0.10.0', FIRST_FIXED_SOCIAL_OAUTH)).toBeGreaterThan(0);
    expect(compareVersions('0.2.2-rc.9007199254740992', '0.2.2-rc.9007199254740993')).toBeLessThan(0);
    expect(compareVersions('0.9007199254740992.0', '0.9007199254740993.0')).toBeLessThan(0);
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
    const order = compareNumericIdentifiers(a.core[index], b.core[index]);
    if (order !== 0) {
      return order;
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
  return comparePrerelease(a.prerelease.split('.'), b.prerelease.split('.'));
}

/**
 * Orders prerelease identifiers by SemVer 2.0.0 section 11: numeric
 * identifiers compare numerically and sort before alphanumeric ones, which
 * compare in ASCII order; a longer list wins when every shared identifier is
 * equal.
 */
function comparePrerelease(left: string[], right: string[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === b) {
      continue;
    }
    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) {
      return compareNumericIdentifiers(a, b);
    }
    if (aNumeric !== bNumeric) {
      return aNumeric ? -1 : 1;
    }
    return a < b ? -1 : 1;
  }
  return left.length - right.length;
}

/**
 * Compares digit strings without converting them to numbers, so identifiers
 * above Number.MAX_SAFE_INTEGER keep their order.
 */
function compareNumericIdentifiers(left: string, right: string): number {
  const a = left.replace(/^0+(?=\d)/, '');
  const b = right.replace(/^0+(?=\d)/, '');
  if (a.length !== b.length) {
    return a.length - b.length;
  }
  return a === b ? 0 : a < b ? -1 : 1;
}

function parseVersion(version: string): { core: string[]; prerelease?: string } {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+.*)?$/.exec(version);
  if (!match) {
    throw new Error(`Unrecognised version ${version}`);
  }
  return { core: [match[1], match[2], match[3]], prerelease: match[4] };
}
