import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from '@superfunctions/db/adapters/memory';
import { registerAccountFileRoutes } from './routes.js';
import { createAccountFileFn, createAccountFileSessionResolver, type AccountFileAuth } from './server.js';
import { createAccountFileStorage } from './storage.js';

/** AuthFn stub resolving every request to the owner with `scopes`, as owned API keys do. */
function authWith(scopes: string[]): AccountFileAuth {
  const session = { actorId: 'user:owner', scopes };
  return {
    provider: { authenticate: vi.fn(async () => session) },
    authorizeMutation: vi.fn(async () => session)
  } as unknown as AccountFileAuth;
}

const requests = () => [
  new Request('http://account.test/files'),
  new Request('http://account.test/files/file-1', { method: 'DELETE' })
];

const restricted = [
  ['memotron:read'],
  ['memotron:read', 'memotron:write'],
  ['pointron:*'],
  ['memotron:*', 'pointron:*'],
  ['nucleum:read'],
  []
];

describe('account FileFn session scopes', () => {
  it('resolves sessions holding every app scope to the owner principal', async () => {
    for (const scopes of [['*'], ['nucleum:*'], ['nucleum:read', 'nucleum:write']]) {
      for (const request of requests()) {
        await expect(createAccountFileSessionResolver(authWith(scopes))(request), scopes.join(' '))
          .resolves.toEqual({ principalId: 'user:owner' });
      }
    }
  });

  it('refuses app-scoped, read-only and scopeless keys instead of granting owner file access', async () => {
    for (const scopes of restricted) {
      for (const request of requests()) {
        await expect(createAccountFileSessionResolver(authWith(scopes))(request), scopes.join(' '))
          .rejects.toMatchObject({ status: 403 });
      }
    }
  });

  it('answers /files with 403 for a restricted key before FileFn runs', async () => {
    const storage = createAccountFileStorage(
      {
        FILEFN_R2_ACCOUNT_ID: 'test-account',
        FILEFN_R2_ACCESS_KEY_ID: randomUUID(),
        FILEFN_R2_SECRET_ACCESS_KEY: randomUUID(),
        FILEFN_R2_BUCKET: 'nucleus-files-test-{region}'
      },
      'insouth',
      { endpoint: 'https://r2.test', fetch: vi.fn() }
    );
    for (const scopes of restricted) {
      const app = new Hono();
      const fileFn = createAccountFileFn({
        auth: authWith(scopes),
        database: memoryAdapter({ debug: false }),
        storage: storage!
      });
      registerAccountFileRoutes({ app, getFileFn: async () => fileFn });
      for (const request of requests()) {
        expect((await app.fetch(request)).status, `${request.method} ${scopes.join(' ')}`).toBe(403);
      }
    }
  });
});
