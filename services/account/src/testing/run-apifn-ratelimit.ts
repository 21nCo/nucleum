import { serve } from '@hono/node-server';
import { runCli } from '@apifn/cli';
import { createAccountTestHarness } from './harness.js';

const port = Number(process.env.ACCOUNT_E2E_RATELIMIT_PORT ?? 18790);
const baseUrl = `http://127.0.0.1:${port}`;
const harness = createAccountTestHarness({
  authority: baseUrl,
  enableRateLimit: true
});

const server = serve({
  fetch: harness.app.fetch,
  hostname: '127.0.0.1',
  port
});

try {
  const exitCode = await runCli([
    'test',
    '.apifn/rate-limit',
    '--env',
    'memory',
    '--env-var',
    `baseUrl=${baseUrl}`,
    '--reporter',
    process.env.APIFN_REPORTER ?? 'console',
    '--output',
    process.env.APIFN_OUTPUT ?? '.apifn/results/ratelimit.json'
  ], {
    cwd: process.cwd()
  });
  process.exitCode = exitCode;
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
