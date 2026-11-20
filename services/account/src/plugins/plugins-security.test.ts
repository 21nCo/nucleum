import { describe, expect, it } from 'vitest';
import { memoryAdapter } from '@superfunctions/db/adapters/memory';
import { authfn, authFnPlugins } from 'authfn';
import { authFnPasswordPlugin } from '@authfn/password';
import { nucleusLifecyclePlugin } from './nucleus-lifecycle.js';
import { nucleusWidgetTokenPlugin } from './widget-token.js';

const ORIGIN = 'https://account-insouth.example.test';

function createServer() {
  return authfn({
    namespace: 'authfn',
    basePath: '/auth',
    cookie: { prefix: 'test', sameSite: 'lax', secure: true },
    plugins: authFnPlugins(
      authFnPasswordPlugin(),
      nucleusLifecyclePlugin({ regionIds: ['insouth', 'useast'] }),
      nucleusWidgetTokenPlugin()
    )
  }).createServer({ database: memoryAdapter({ debug: false }) });
}

async function signUp(server: ReturnType<typeof createServer>) {
  const response = await server.router.handle(new Request(`${ORIGIN}/auth/sign-up/password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'widget-owner@example.com', password: 'test-password-long-enough' })
  }));
  expect(response.status).toBe(200);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.slice(0, cookie.indexOf(';')));
  const csrf = cookies.find((cookie) => cookie.startsWith('test.csrf='))?.split('=')[1] ?? '';
  return { cookie: cookies.join('; '), csrf: decodeURIComponent(csrf) };
}

function post(server: ReturnType<typeof createServer>, path: string, headers: Record<string, string>, body: unknown = {}) {
  return server.router.handle(new Request(`${ORIGIN}/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  }));
}

describe('account plugin request checks', () => {
  it('refuses widget-token create and revoke from a cookie session without the CSRF header', async () => {
    const server = createServer();
    const { cookie, csrf } = await signUp(server);

    expect((await post(server, '/widget-token', { cookie })).status).toBe(403);
    expect((await post(server, '/widget-token/revoke', { cookie })).status).toBe(403);

    expect((await post(server, '/widget-token', { cookie, 'x-authfn-csrf': csrf })).status).toBe(200);
    expect((await post(server, '/widget-token/revoke', { cookie, 'x-authfn-csrf': csrf })).status).toBe(200);
  });

  it('accepts only configured regions in account bootstrap', async () => {
    const server = createServer();
    const { cookie, csrf } = await signUp(server);
    const headers = { cookie, 'x-authfn-csrf': csrf };

    const unknown = await post(server, '/nucleus/bootstrap', headers, { region: '<script>' });
    expect(unknown.status).toBe(400);
    const configured = await post(server, '/nucleus/bootstrap', headers, { region: 'USEast' });
    expect(configured.status).toBe(200);
  });
});
