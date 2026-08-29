import { serve } from "@hono/node-server";
import { createAsyncLocalRequestContext } from "@superfunctions/observability/node";
import { createApp } from "./app.js";
import { createNodeDatabase } from "./db/node.js";
import { createNodeSyncDatabase } from "./db/datafn-node.js";
import { createLogger } from "./logging.js";
import { createAccountObservability } from "./observability/events.js";
import { createAccountNodeRuntimeStores } from "./runtime-stores.js";

const logger = createLogger();
const database = createNodeDatabase();
let syncDatabase: ReturnType<typeof createNodeSyncDatabase> | undefined;
const observability = createAccountObservability(logger, undefined, {
  requestContext: createAsyncLocalRequestContext()
});
const app = createApp({
  infra: {
    database: database.adapter,
    syncDatabase: () => {
      syncDatabase ??= createNodeSyncDatabase();
      return syncDatabase.adapter;
    },
    stores: createAccountNodeRuntimeStores(),
    logger
  },
  deployment: {
    observability
  }
});
const port = Number(process.env.PORT ?? 8787);

serve({
  fetch: app.fetch,
  port
});

logger.info("nucleus account service started", {
  port
});

const shutdown = async () => {
  logger.info("nucleus account service shutting down");
  await syncDatabase?.close();
  await database.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
