import { getAccountCacheStore } from './cache.js';
import { createAccountApp } from './app.js';
import {
  createCloudflareDatabase,
  type AccountWorkerEnv,
  type CloudflareSecretsStoreBinding
} from './db/cloudflare.js';
import { createAccountCloudflareLookupStore } from './lookup/cloudflare-do.js';
import { createAccountLogger } from './logging.js';
import {
  createAccountLatencyMetrics,
  observeAdapter,
  observeKVStore,
  observeLookupStore
} from './observability/latency.js';

export { AuthFnRegionLookupDurableObject } from './lookup/cloudflare-do.js';

const SECRETS_STORE_ENV_KEYS = new Set([
  'RESEND_API_KEY',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'APPLE_OAUTH_CLIENT_ID',
  'APPLE_JWT',
  'APPLE_OAUTH_CLIENT_SECRET',
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID'
]);

export default {
  async fetch(request: Request, env: AccountWorkerEnv, ctx?: ExecutionContext): Promise<Response> {
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

    const logger = createAccountLogger();
    const database = createCloudflareDatabase(env);
    const latencyMetrics = createAccountLatencyMetrics();
    const workerColo = readWorkerColo(request);
    const lookupStore = env.AUTHFN_REGION_LOOKUP
      ? observeLookupStore(createAccountCloudflareLookupStore(env.AUTHFN_REGION_LOOKUP), latencyMetrics)
      : undefined;
    const app = createAccountApp({
      database: observeAdapter(database.adapter, latencyMetrics),
      cacheStore: observeKVStore(getAccountCacheStore(env.ACCOUNT_CACHE ?? null), latencyMetrics),
      lookupStore,
      logger,
      latencyMetrics,
      workerColo
    });

    try {
      return await app.fetch(request, env);
    } finally {
      await database.close();
    }
  }
};

async function copyWorkerEnvToProcessEnv(
  env: AccountWorkerEnv,
  target: Record<string, string>
): Promise<void> {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
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

function isSecretsStoreBinding(value: unknown): value is CloudflareSecretsStoreBinding {
  return Boolean(value)
    && typeof value === 'object'
    && typeof (value as CloudflareSecretsStoreBinding).get === 'function';
}

function readWorkerColo(request: Request): string | undefined {
  const cf = (request as Request & {
    cf?: {
      colo?: unknown;
    };
  }).cf;
  return typeof cf?.colo === 'string' ? cf.colo : undefined;
}
