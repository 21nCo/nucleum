import assert from 'node:assert/strict';
import { ACCOUNT_AUTH_NAMESPACE } from '../auth/constants.js';
import { createAccountTestHarness } from './harness.js';

const authority = 'http://127.0.0.1:18787';
const email = 'otp-existing-user@example.test';
const oauthCode = 'verified-google-user';
const harness = createAccountTestHarness({
  authority,
  enableRateLimit: false
});

try {
  harness.oauth.setUser('google', oauthCode, {
    providerAccountId: 'google-existing-user',
    email,
    emailVerified: true,
    name: 'Verified Google User'
  });

  const started = await post('/auth/social/start', {
    provider: 'google',
    returnTo: `${authority}/auth/callback`
  });
  const stateId = readString(started.data?.stateId);
  assert.ok(stateId);

  const callback = await harness.app.fetch(new Request(
    `${authority}/auth/social/callback/google?code=${oauthCode}&state=${encodeURIComponent(stateId)}`
  ));
  assert.equal(callback.status, 303);

  const usersAfterOAuth = await usersByEmail(email);
  assert.equal(usersAfterOAuth.length, 1);
  const googleUserId = readString(usersAfterOAuth[0]?.id);
  assert.ok(googleUserId);

  await post('/auth/otp/send', {
    purpose: 'sign-up',
    email
  });
  const message = harness.delivery.latest(email);
  assert.ok(message);

  const verified = await post('/auth/otp/verify', {
    purpose: 'sign-up',
    email,
    code: message.code,
    profile: {
      name: ''
    },
    sessionMode: 'bearer'
  });
  const session = readRecord(verified.data?.session);
  assert.equal(readString(session?.actorId), googleUserId);

  const usersAfterOtp = await usersByEmail(email);
  assert.equal(usersAfterOtp.length, 1);
  assert.equal(readString(usersAfterOtp[0]?.id), googleUserId);

  const linkEvent = harness.authEvents().find((event) =>
    event.type === 'authfn.account_linked'
    && event.userId === googleUserId
    && event.metadata?.method === 'email-otp'
  );
  assert.ok(linkEvent);

  console.log('OTP sign-up reused existing verified OAuth user');
} finally {
  await harness.reset();
}

async function post(path: string, body: Record<string, unknown>) {
  const response = await harness.app.fetch(new Request(`${authority}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  }));
  const payload = await response.json() as {
    ok: boolean;
    data?: Record<string, unknown>;
    error?: unknown;
  };
  assert.equal(payload.ok, true, JSON.stringify(payload.error));
  return payload;
}

async function usersByEmail(primaryEmail: string) {
  return harness.database.findMany({
    model: 'users',
    where: [{ field: 'primaryEmail', operator: 'eq', value: primaryEmail }],
    namespace: ACCOUNT_AUTH_NAMESPACE
  }) as Promise<Record<string, unknown>[]>;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
