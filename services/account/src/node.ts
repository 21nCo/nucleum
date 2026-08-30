import { isIP } from "node:net";
import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono } from "hono";
import { createAsyncLocalRequestContext } from "@superfunctions/observability/node";
import { buildAccountServices, registerCoreRoutes } from "./app.js";
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
const verifiedClientIps = new WeakMap<Request, string>();
const services = buildAccountServices({
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
    observability,
    resolveClientIp: (request) => verifiedClientIps.get(request)
  }
});
const app = new Hono();
app.use("*", async (c, next) => {
  const clientIp = resolveNodeClientIp(
    c.req.raw,
    getConnInfo(c).remote.address
  );
  if (clientIp) {
    verifiedClientIps.set(c.req.raw, clientIp);
  }
  await next();
});
registerCoreRoutes(app, services);
const port = Number(process.env.PORT ?? 8787);

const server = serve({
  fetch: app.fetch,
  port
});

logger.info("nucleus account service started", {
  port
});

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info("nucleus account service shutting down");
  try {
    try {
      await closeServer(server);
    } catch (error) {
      logger.error("nucleus account server close failed", { error });
    }
    try {
      await services.close();
    } finally {
      try {
        await syncDatabase?.close();
      } finally {
        await database.close();
      }
    }
  } catch (error) {
    logger.error("nucleus account shutdown cleanup failed", { error });
  } finally {
    process.exit(0);
  }
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

function resolveNodeClientIp(
  request: Request,
  remoteAddress: string | undefined
): string | undefined {
  const remoteIp = normalizeIpAddress(remoteAddress);
  if (!remoteIp || !isLoopbackAddress(remoteIp)) {
    return remoteIp;
  }
  return normalizeIpAddress(
    request.headers.get("x-forwarded-for")?.split(",")[0]
  ) ?? remoteIp;
}

function normalizeIpAddress(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/^::ffff:/, "");
  return normalized && isIP(normalized) !== 0 ? normalized : undefined;
}

function isLoopbackAddress(value: string): boolean {
  return value === "127.0.0.1" || value === "::1";
}

function closeServer(serverInstance: ReturnType<typeof serve>): Promise<void> {
  return new Promise((resolve, reject) => {
    serverInstance.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
