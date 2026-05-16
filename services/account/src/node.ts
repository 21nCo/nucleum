import { serve } from '@hono/node-server';
import { getAccountCacheStore } from './cache.js';
import { createAccountApp } from './app.js';
import { createNodeDatabase } from './db/node.js';
import { createAccountLogger } from './logging.js';

const logger = createAccountLogger();
const database = createNodeDatabase();
const app = createAccountApp({
  database: database.adapter,
  cacheStore: getAccountCacheStore(),
  logger
});
const port = Number(process.env.PORT ?? 8787);

serve({
  fetch: app.fetch,
  port
});

logger.info('nucleus account service started', {
  port
});

const shutdown = async () => {
  logger.info('nucleus account service shutting down');
  await database.close();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
