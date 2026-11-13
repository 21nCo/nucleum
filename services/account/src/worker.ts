import { createAsyncLocalRequestContext } from "@superfunctions/observability/node";
import { Hono } from "hono";
import { buildAccountServices, registerCoreRoutes } from "./app.js";
import { createCloudflareDatabase } from "./db/cloudflare.js";
import { createCloudflareSyncDatabase } from "./db/sync-cloudflare.js";
import {
  createCloudflareFileDatabase,
  type AccountFileDatabase
} from "./files/database.js";
import {
  closeAfterDeferredWork,
  createFileDeferredWork
} from "./files/deferred.js";
import { createAccountFileStorage } from "./files/storage.js";
import { createAccountCloudflareLookupStore } from "./lookup/cloudflare-do.js";
import { createLogger } from "./logging.js";
import { createAccountObservability as createObservability } from "./observability/events.js";
import { createAccountCloudflareRuntimeStores } from "./runtime-stores.js";
import type {
  AccountWorkerEnv,
  CloudflareSecretsStoreBinding
} from "./worker-env.js";

export { AuthFnRegionLookupDurableObject } from "./lookup/cloudflare-do.js";
export { AccountRuntimeStoresDurableObject } from "./runtime-stores.js";

const SECRETS_STORE_ENV_KEYS = new Set([
  "RESEND_API_KEY",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "APPLE_OAUTH_CLIENT_ID",
  "APPLE_JWT",
  "APPLE_OAUTH_CLIENT_SECRET",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "DATAFN_OPENSEARCH_URL",
  "DATAFN_OPENSEARCH_API_KEY",
  "FILEFN_R2_ACCOUNT_ID",
  "FILEFN_R2_ACCESS_KEY_ID",
  "FILEFN_R2_SECRET_ACCESS_KEY"
]);

export default {
  async fetch(
    request: Request,
    env: AccountWorkerEnv,
    ctx?: ExecutionContext
  ): Promise<Response> {
    (globalThis as typeof globalThis & { ctx?: ExecutionContext }).ctx = ctx;
    const globalProcess = globalThis as unknown as {
      process?: {
        env: Record<string, string>;
      };
    };
    globalProcess.process ??= {
      env: {}
    };
    await copyWorkerEnvToProcessEnv(env, globalProcess.process.env);

    const logger = createLogger();
    const database = createCloudflareDatabase(env);
    let syncDatabase:
      | ReturnType<typeof createCloudflareSyncDatabase>
      | undefined;
    let fileDatabase: AccountFileDatabase | undefined;
    const fileDeferredWork = createFileDeferredWork(ctx);
    const workerEnv = globalProcess.process.env;
    const observability = createObservability(logger, undefined, {
      requestContext: createAsyncLocalRequestContext()
    });
    const workerColo = readWorkerColo(request);
    const regionLookupStore = env.AUTHFN_REGION_LOOKUP
      ? createAccountCloudflareLookupStore(env.AUTHFN_REGION_LOOKUP)
      : undefined;
    const services = buildAccountServices({
      infra: {
        database: database.adapter,
        syncDatabase: () => {
          syncDatabase ??= createCloudflareSyncDatabase(env);
          return syncDatabase.adapter;
        },
        stores: createAccountCloudflareRuntimeStores(env),
        logger,
        files: {
          database: () => {
            fileDatabase ??= createCloudflareFileDatabase(env);
            return fileDatabase.adapter;
          },
          storage: (regionId) => createAccountFileStorage(workerEnv, regionId),
          runtime: ctx ? fileDeferredWork.runtime : undefined
        }
      },
      deployment: {
        regionLookupStore,
        observability,
        resolveClientIp: readCloudflareClientIp,
        workerColo
      }
    });
    const app = new Hono();
    registerCoreRoutes(app, services);

    const closeRequestResources = async (): Promise<void> => {
      try {
        await services.close();
      } finally {
        try {
          await syncDatabase?.close();
        } finally {
          try {
            await fileDatabase?.close();
          } finally {
            await database.close();
          }
        }
      }
    };

    try {
      return await app.fetch(request, env);
    } finally {
      await closeAfterDeferredWork({
        ctx,
        deferred: fileDeferredWork,
        close: closeRequestResources,
        onError: (error) => {
          logger.error("nucleus account deferred close failed", { error });
        }
      });
    }
  }
};

async function copyWorkerEnvToProcessEnv(
  env: AccountWorkerEnv,
  target: Record<string, string>
): Promise<void> {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      target[key] = value;
      continue;
    }

    if (SECRETS_STORE_ENV_KEYS.has(key) && isSecretsStoreBinding(value)) {
      const secret = await value.get();
      if (secret) {
        target[key] = secret;
      }
    }
  }
}

function isSecretsStoreBinding(
  value: unknown
): value is CloudflareSecretsStoreBinding {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as CloudflareSecretsStoreBinding).get === "function"
  );
}

function readWorkerColo(request: Request): string | undefined {
  const cf = (
    request as Request & {
      cf?: {
        colo?: unknown;
      };
    }
  ).cf;
  return typeof cf?.colo === "string" ? cf.colo : undefined;
}

function readCloudflareClientIp(request: Request): string | undefined {
  return request.headers.get("cf-connecting-ip")?.trim() || undefined;
}
