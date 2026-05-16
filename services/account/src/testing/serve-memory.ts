import { serve } from '@hono/node-server';
import { createAccountTestHarness } from './harness.js';

const port = Number(process.env.ACCOUNT_MEMORY_PORT ?? 3000);
const hostname = process.env.ACCOUNT_MEMORY_HOST ?? '127.0.0.1';
const authority = process.env.ACCOUNT_MEMORY_AUTHORITY ?? `http://${hostname}:${port}`;
const corsOrigins = readCsv(
  process.env.ACCOUNT_CORS_ORIGINS
    ?? 'http://127.0.0.1:5050,http://localhost:5050,http://127.0.0.1:5173,http://localhost:5173'
);

const harness = createAccountTestHarness({
  regionId: process.env.ACCOUNT_REGION_ID ?? 'useast',
  authority,
  enableRateLimit: process.env.ACCOUNT_MEMORY_RATE_LIMIT === 'true',
  corsOrigins
});

const server = serve({
  fetch: harness.app.fetch,
  hostname,
  port
});

console.log('Nucleus account memory service listening');
console.log(`Allowed CORS origins configured: ${corsOrigins.length}`);

async function close() {
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

process.once('SIGINT', () => {
  void close().finally(() => process.exit(0));
});
process.once('SIGTERM', () => {
  void close().finally(() => process.exit(0));
});

function readCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
