import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OAUTH_EMAIL_LINKING_PROVIDERS } from '../auth.js';
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

  it('refuses to attach an Apple sign-in to an existing account with the same verified email', async () => {
    const existingUserId = await createVerifiedUser(email);
    harness.oauth.setUser('apple', 'apple-same-email', {
      providerAccountId: 'apple-same-email-sub',
      email,
      emailVerified: true
    });

    const callback = await oauthCallback('apple', 'apple-same-email');
    expect(callback.status).not.toBe(200);

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
