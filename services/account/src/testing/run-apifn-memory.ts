import { serve } from '@hono/node-server';
import { runCli } from '@apifn/cli';
import { createAccountTestHarness } from './harness.js';
import { runDatafnSmokeTests } from './datafn-smoke.js';

const port = Number(process.env.ACCOUNT_E2E_PORT ?? 18787);
const baseUrl = `http://127.0.0.1:${port}`;
const harness = createAccountTestHarness({
  authority: baseUrl,
  enableRateLimit: false,
  corsOrigins: [baseUrl]
});

const server = serve({
  fetch: harness.app.fetch,
  hostname: '127.0.0.1',
  port
});

try {
  const exitCode = await runCli([
    'test',
    '.apifn/account',
    '--env',
    'memory',
    '--env-var',
    `baseUrl=${baseUrl}`,
    '--reporter',
    process.env.APIFN_REPORTER ?? 'console',
    '--output',
    process.env.APIFN_OUTPUT ?? '.apifn/results/memory.json'
  ], {
    cwd: process.cwd()
  });
  if (exitCode === 0) {
    await runDatafnSmokeTests(harness, baseUrl);
  }
  process.exitCode = exitCode;
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
