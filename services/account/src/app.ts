import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Adapter, ConditionalKVStoreAdapter, RuntimeStores } from "@superfunctions/db";
import type { SuperfunctionObservability } from "@superfunctions/observability";
import type {
  AuthFnDeliveryMessageResolver,
  AuthFnDeliveryProvider,
  AuthFnRateLimitConfig,
  AuthFnServer
} from "authfn";
import type {
  AuthFnMultiRegionRegionConfig
} from "@authfn/multi-region";
import type { RateLimitConfig } from "@datafn/server";
import type {
  AuthFnSocialProviderConfig,
  SocialOAuthPluginRuntimeConfig
} from "@authfn/social-oauth";
import type { Logger } from "@logfn/core";
import { createAccountAuth } from "./auth.js";
import { registerAccountAuthRoutes } from "./auth/routes.js";
import {
  createAccountOtpDeliveryMessage,
  createSendFnDeliveryProvider
} from "./email/sendfn.js";
import {
  createAccountObservability as createObservability,
  type AccountEventSink,
  type AccountObservationEvent
} from "./observability/events.js";
import { sendAccountDebugLog } from "./debug-sink.js";
import { createSyncServer } from "./datafn/server.js";
import type { SearchProvider } from "@datafn/server";
import type { SyncServer } from "./datafn/server.js";
import { registerAccountDatafnRoutes } from "./datafn/routes.js";
import { createAccountRequestObservationMiddleware } from "./http/observability.js";

/** Required infrastructure dependencies for the account app. */
export type AccountSyncDatabaseProvider =
  | Adapter
  | (() => Adapter | Promise<Adapter>);

export interface AccountInfra {
  database: Adapter;
  syncDatabase: AccountSyncDatabaseProvider;
  stores: RuntimeStores;
  logger: Logger;
  syncSearchProvider?: SearchProvider;
}

/** Deployment-specific configuration that varies per runtime (node, worker, tests). */
export interface AccountDeployment {
  regionId?: string;
  regions?: AuthFnMultiRegionRegionConfig[];
  regionLookupStore?: ConditionalKVStoreAdapter;
  corsOrigins?: string[];
  observability?: SuperfunctionObservability<AccountObservationEvent>;
  resolveClientIp?: AuthFnRateLimitConfig["resolveClientIp"];
  workerColo?: string;
}

/** Pluggable integrations and observability hooks. */
export interface AccountIntegrations {
  delivery?: AuthFnDeliveryProvider;
  deliveryMessage?: AuthFnDeliveryMessageResolver;
  oauthProviders?: Partial<
    Record<"google" | "apple", AuthFnSocialProviderConfig | undefined>
  >;
  oauthPlugin?: Omit<SocialOAuthPluginRuntimeConfig, "providers">;
  authRateLimit?: false | AuthFnRateLimitConfig;
  syncRateLimit?: false | RateLimitConfig;
  eventSink?: AccountEventSink;
}

export interface CreateAccountAppInput {
  infra: AccountInfra;
  deployment?: AccountDeployment;
  integrations?: AccountIntegrations;
}

/** Fully wired account service graph produced by {@link buildAccountServices}. */
export interface AccountServices {
  auth: AuthFnServer;
  getSyncServer: () => Promise<SyncServer>;
  regionId: string;
  corsOrigins: string[];
  observability: SuperfunctionObservability<AccountObservationEvent>;
  infra: AccountInfra;
  deployment: AccountDeployment;
  integrations: AccountIntegrations;
  close(): Promise<void>;
}

/**
 * Resolves the complete account service graph (auth, sync, observability)
 * without registering any HTTP routes. This is the composition root shared by
 * production entrypoints and the test harness.
 */
export function buildAccountServices(
  input: CreateAccountAppInput
): AccountServices {
  const { infra } = input;
  const deployment = input.deployment ?? {};
  const integrations = input.integrations ?? {};
  const corsOrigins = withNativeEmbedOrigins(
    deployment.corsOrigins ?? readCsv(process.env.ACCOUNT_CORS_ORIGINS)
  );
  const observability =
    deployment.observability ??
    createObservability(infra.logger, integrations.eventSink);
  const regionId =
    deployment.regionId ??
    process.env.ACCOUNT_REGION_ID ??
    deployment.regions?.[0]?.regionId ??
    "local";
  const authRateLimit: AuthFnRateLimitConfig =
    integrations.authRateLimit === false
      ? { enabled: false }
      : {
          enabled: true,
          mode: infra.stores.atomicKv
            ? "strict"
            : infra.stores.kv
              ? "best-effort"
              : "local",
          resolveClientIp: deployment.resolveClientIp,
          ...integrations.authRateLimit
        };
  const auth = createAccountAuth({
    database: infra.database,
    stores: infra.stores,
    delivery:
      integrations.delivery ??
      createSendFnDeliveryProvider({
        database: infra.database,
        logger: infra.logger
      }),
    deliveryMessage:
      integrations.deliveryMessage ?? createAccountOtpDeliveryMessage,
    regions: deployment.regions,
    regionLookupStore: deployment.regionLookupStore,
    oauthProviders: integrations.oauthProviders,
    oauthPlugin: integrations.oauthPlugin,
    rateLimit: authRateLimit,
    observability
  });
  let syncServer: Promise<SyncServer> | undefined;
  const getSyncServer = () => {
    syncServer ??= resolveSyncDatabase(infra.syncDatabase)
      .then((syncDatabase) =>
        createSyncServer({
          auth: {
            authenticate: (request) => auth.provider.authenticate(request),
            authorizeMutation: (request) => auth.authorizeMutation(request)
          },
          database: syncDatabase,
          stores: infra.stores,
          regionId,
          observability,
          searchProvider: infra.syncSearchProvider,
          rateLimit: integrations.syncRateLimit
        })
      )
      .catch((error) => {
        syncServer = undefined;
        throw error;
      });
    return syncServer;
  };
  const close = async (): Promise<void> => {
    const current = syncServer;
    syncServer = undefined;
    if (!current) {
      return;
    }
    const server = await current.catch(() => undefined);
    await server?.close();
  };

  return {
    auth,
    getSyncServer,
    regionId,
    corsOrigins,
    observability,
    infra,
    deployment,
    integrations,
    close
  };
}

/**
 * Registers the production HTTP surface (CORS, latency logging, health,
 * OpenAPI, sync, and auth routes) onto an app for the given services.
 */
export function registerCoreRoutes(app: Hono, services: AccountServices): void {
  const { auth, getSyncServer, regionId, corsOrigins, observability } =
    services;
  const { logger } = services.infra;
  const { workerColo } = services.deployment;

  if (corsOrigins.length > 0) {
    app.use("*", async (c, next) => {
      const origin = c.req.header("origin");
      const isAllowedOrigin = !origin || corsOrigins.includes(origin);
      if (!isAllowedOrigin && c.req.method === "OPTIONS") {
        return c.body(null, 403);
      }
      await next();
      if (!isAllowedOrigin) {
        c.res.headers.delete("access-control-allow-credentials");
      }
      return undefined;
    });
    app.use(
      "*",
      cors({
        origin: (origin) => (corsOrigins.includes(origin) ? origin : null),
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: [
          "content-type",
          "authorization",
          "x-authfn-csrf",
          "x-request-id",
          "x-datafn-client-id",
          "x-datafn-mutation-id",
          "x-datafn-public-link-token",
          "x-datafn-schema-hash",
          "x-datafn-sync-cursor"
        ],
        exposeHeaders: [
          "x-request-id",
          "server-timing",
          "x-account-db-call-count",
          "x-account-db-duration-ms",
          "x-account-db-max-duration-ms",
          "x-account-cache-call-count",
          "x-account-cache-duration-ms",
          "x-account-lookup-call-count",
          "x-account-lookup-duration-ms",
          "x-account-region",
          "x-account-worker-colo",
          "x-datafn-region"
        ],
        credentials: true,
        maxAge: 600
      })
    );
  }

  app.use(
    "*",
    createAccountRequestObservationMiddleware({
      observability,
      logger,
      regionId,
      workerColo,
      sendDebugLog: sendAccountDebugLog
    })
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "nucleus-account"
    })
  );

  app.get("/openapi.json", (c) => c.json(auth.openApi?.() ?? {}));

  registerAccountDatafnRoutes({
    app,
    getSyncServer
  });
  registerAccountAuthRoutes({ app, auth });
}

export function createApp(input: CreateAccountAppInput): Hono {
  const app = new Hono();
  registerCoreRoutes(app, buildAccountServices(input));
  return app;
}

async function resolveSyncDatabase(
  provider: AccountSyncDatabaseProvider
): Promise<Adapter> {
  return typeof provider === "function" ? await provider() : provider;
}

function withNativeEmbedOrigins(origins: string[]): string[] {
  return Array.from(new Set([...origins, "tauri://localhost"]));
}

function readCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
