import { serve } from '@hono/node-server';
import { runCli } from '@apifn/cli';
import { createMultiRegionAccountHarness } from './harness.js';

const primaryPort = Number(process.env.ACCOUNT_E2E_PRIMARY_PORT ?? 18788);
const secondaryPort = Number(process.env.ACCOUNT_E2E_SECONDARY_PORT ?? 18789);
const usBaseUrl = `http://127.0.0.1:${primaryPort}`;
const euBaseUrl = `http://127.0.0.1:${secondaryPort}`;
const harness = createMultiRegionAccountHarness({
  primaryAuthority: usBaseUrl,
  secondaryAuthority: euBaseUrl
});

const primaryServer = serve({
  fetch: harness.primary.app.fetch,
  hostname: '127.0.0.1',
  port: primaryPort
});
const secondaryServer = serve({
  fetch: harness.secondary.app.fetch,
  hostname: '127.0.0.1',
  port: secondaryPort
});

try {
  const exitCode = await runCli([
    'test',
    '.apifn/multi-region',
    '--env',
    'memory',
    '--env-var',
    `usBaseUrl=${usBaseUrl}`,
    '--env-var',
    `euBaseUrl=${euBaseUrl}`,
    '--reporter',
    process.env.APIFN_REPORTER ?? 'console',
    '--output',
    process.env.APIFN_OUTPUT ?? '.apifn/results/multiregion.json'
  ], {
    cwd: process.cwd()
  });
  process.exitCode = exitCode;
} finally {
  await Promise.all([
    closeServer(primaryServer),
    closeServer(secondaryServer)
  ]);
}

function closeServer(server: { close(callback: (error?: Error) => void): void }): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
