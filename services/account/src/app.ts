import { AsyncLocalStorage } from "node:async_hooks";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  wrapWithRowLevelNamespace,
  type Adapter,
  type ConditionalKVStoreAdapter,
  type RuntimeStores,
  type TransactionAdapter
} from "@superfunctions/db";
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
import type { RateLimitConfig, SearchProvider } from "@datafn/server";
import type {
  AuthFnSocialProviderConfig,
  SocialOAuthPluginRuntimeConfig
} from "@authfn/social-oauth";
import type { Logger } from "@logfn/core";
import type { FileFn, FileFnRuntime } from "@filefn/server";
import type { StorageAdapter } from "@superfunctions/storage";
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
import { createSyncSearchProvider } from "./datafn/search-provider.js";
import type { SyncServer } from "./datafn/server.js";
import { registerAccountDatafnRoutes } from "./datafn/routes.js";
import {
  createFileDeletionCascade,
  type FileDeletionCascade,
  type FileDeletionRetryResult
} from "./datafn/file-deletions.js";
import { createAccountRequestObservationMiddleware } from "./http/observability.js";
import type { AccountFileProcessing } from "./files/processing.js";
import { createAccountFileFn } from "./files/server.js";
import { registerAccountFileRoutes } from "./files/routes.js";
import { registerInterfaceApiRoutes } from "./api/routes.js";
import { registerInterfaceMcpRoutes } from "./mcp/routes.js";
import type { InterfaceApiServices } from "./api/router.js";

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
  files?: AccountFilesInfra;
}

/**
 * FileFn dependencies. `storage` receives the resolved region ID so each
 * region uses its own bucket, and returns null when storage is not configured.
 */
export interface AccountFilesInfra {
  database: AccountSyncDatabaseProvider;
  storage: (regionId: string) => StorageAdapter | null;
  runtime?: FileFnRuntime;
  /**
   * Server processing for the environment's `fileProcessingMode`; undefined
   * (or no provider) leaves processing to the device.
   */
  processing?: () =>
    | AccountFileProcessing
    | undefined
    | Promise<AccountFileProcessing | undefined>;
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
  getFileFn: () => Promise<FileFn | null>;
  /**
   * Retries FileFn deletions still owed for permanently deleted `file`
   * records. DataFn requests already retry them in the background once a
   * minute; a scheduled job may also call this. Without file infrastructure
   * it does nothing.
   */
  retryFileDeletions: (options?: { limit?: number }) => Promise<FileDeletionRetryResult>;
  /**
   * The search provider the sync server indexes writes with, and the region
   * it tags them with, once `getSyncServer` has created that server; undefined
   * before then or when search is not configured.
   */
  getSyncSearchIndex?: () => { provider: SearchProvider; regionId?: string } | undefined;
  /**
   * Reads one row of a namespace by id from the sync server's database,
   * scoped to that namespace as DataFn scopes its own reads: a single lookup
   * bounded by the id, outside DataFn's authorization, rate limits and
   * response hooks, for callers that already authorized the access.
   */
  readSyncRecord: SyncRecordReader;
  /** Reads the rows of a namespace that match every clause, scoped as readSyncRecord is. */
  findSyncRecords: SyncTransactionReads["find"];
  /**
   * Runs `write` with `check` run inside each sync database transaction the
   * write opens (one for a DataFn transact call), after the transaction's
   * work and before it commits. `check` reads rows through that transaction,
   * scoped as readSyncRecord is; a check that throws rolls the transaction
   * back.
   */
  inSyncWriteTransaction: <T>(
    check: (transaction: SyncTransactionReads) => Promise<void>,
    write: () => Promise<T>
  ) => Promise<T>;
  regionId: string;
  corsOrigins: string[];
  observability: SuperfunctionObservability<AccountObservationEvent>;
  infra: AccountInfra;
  deployment: AccountDeployment;
  integrations: AccountIntegrations;
  close(): Promise<void>;
}

/** Reads one row of a namespace by id. */
export type SyncRecordReader = (
  resource: string,
  id: string,
  namespace: string
) => Promise<Record<string, unknown> | null>;

/** Namespace-scoped reads through one sync database transaction. */
export interface SyncTransactionReads {
  read: SyncRecordReader;
  find(
    model: string,
    where: readonly { field: string; operator: "eq" | "in"; value: unknown }[],
    namespace: string
  ): Promise<Record<string, unknown>[]>;
}

type SyncWriteCheck = (transaction: SyncTransactionReads) => Promise<void>;

/** The checks of the sync write running in the current async context. */
const syncWriteChecks = new AsyncLocalStorage<SyncWriteCheck>();

/** Reads scoped to a namespace by the `__ns` column, as DataFn scopes its reads. */
function namespacedReads(database: Adapter): SyncTransactionReads {
  const scoped = wrapWithRowLevelNamespace(database, {
    enabled: true,
    columnName: "__ns",
    mandatory: true
  });
  return {
    read: (resource, id, namespace) =>
      scoped.findOne<Record<string, unknown>>({
        model: resource,
        where: [{ field: "id", operator: "eq", value: id }],
        namespace
      }),
    find: (model, where, namespace) =>
      scoped.findMany<Record<string, unknown>>({
        model,
        where: where.map((clause) => ({ ...clause })),
        namespace
      })
  };
}

/**
 * The sync database with the current sync write's checks run inside each
 * transaction it opens, after the transaction's work and before it commits.
 */
function withSyncWriteChecks(database: Adapter): Adapter {
  return new Proxy(database, {
    get(target, property) {
      if (property !== "transaction") {
        const value: unknown = Reflect.get(target, property, target);
        // Bound to the adapter itself, whose methods may use private state.
        return typeof value === "function" ? value.bind(target) : value;
      }
      return <R>(callback: (trx: TransactionAdapter) => Promise<R>): Promise<R> =>
        target.transaction(async (trx) => {
          const result = await callback(trx);
          const check = syncWriteChecks.getStore();
          // Only the reads below run on the transaction, which lacks transaction() and close().
          if (check) await check(namespacedReads(trx as unknown as Adapter));
          return result;
        });
    }
  });
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
  let fileFn: Promise<FileFn | null> | undefined;
  const getFileFn = () => {
    fileFn ??= resolveFileFn(infra, regionId, auth).catch((error) => {
      fileFn = undefined;
      throw error;
    });
    return fileFn;
  };
  const createFileDeletions = (
    syncDatabase: Adapter
  ): FileDeletionCascade | undefined =>
    infra.files
      ? createFileDeletionCascade({
          database: syncDatabase,
          getFileFn,
          runtime: infra.files.runtime,
          onError: (error, context) => {
            infra.logger.error("nucleus account file deletion failed", {
              error,
              attempts: context.attempts
            });
          }
        })
      : undefined;
  let syncServer: Promise<SyncServer> | undefined;
  let syncSearchProvider: SearchProvider | undefined;
  let readSyncDatabase: SyncTransactionReads | undefined;
  const getSyncServer = () => {
    syncServer ??= resolveSyncDatabase(infra.syncDatabase)
      .then((syncDatabase) => {
        readSyncDatabase = namespacedReads(syncDatabase);
        // Resolved here, as the sync server would, so the v1 API indexes its
        // writes with the same provider instance.
        syncSearchProvider =
          infra.syncSearchProvider ??
          createSyncSearchProvider({ observability, regionId });
        return createSyncServer({
          auth: {
            authenticate: (request) => auth.provider.authenticate(request),
            authorizeMutation: (request) => auth.authorizeMutation(request)
          },
          database: withSyncWriteChecks(syncDatabase),
          stores: infra.stores,
          regionId,
          observability,
          searchProvider: syncSearchProvider,
          rateLimit: integrations.syncRateLimit,
          resolveClientIp: deployment.resolveClientIp,
          fileDeletions: createFileDeletions(syncDatabase)
        });
      })
      .catch((error) => {
        syncServer = undefined;
        throw error;
      });
    return syncServer;
  };
  const retryFileDeletions = async (
    options?: { limit?: number }
  ): Promise<FileDeletionRetryResult> => {
    const fileDeletions = createFileDeletions(
      await resolveSyncDatabase(infra.syncDatabase)
    );
    return fileDeletions
      ? fileDeletions.retryDue(options)
      : { deleted: 0, kept: 0, retrying: 0 };
  };
  const close = async (): Promise<void> => {
    fileFn = undefined;
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
    getFileFn,
    retryFileDeletions,
    getSyncSearchIndex: () =>
      syncSearchProvider
        ? {
            provider: syncSearchProvider,
            // createSyncServer adds DataFn's multi-region plugin, which tags
            // indexed records with this region, only with a directory store.
            regionId: infra.stores.directory ? regionId : undefined
          }
        : undefined,
    readSyncRecord: async (resource, id, namespace) => {
      await getSyncServer();
      if (!readSyncDatabase) throw new Error("Sync database unavailable");
      return readSyncDatabase.read(resource, id, namespace);
    },
    findSyncRecords: async (model, where, namespace) => {
      await getSyncServer();
      if (!readSyncDatabase) throw new Error("Sync database unavailable");
      return readSyncDatabase.find(model, where, namespace);
    },
    inSyncWriteTransaction: (check, write) => syncWriteChecks.run(check, write),
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
  const {
    auth,
    getSyncServer,
    getFileFn,
    regionId,
    corsOrigins,
    observability
  } = services;
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
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: [
          "content-type",
          "authorization",
          "x-authfn-csrf",
          "x-request-id",
          "x-datafn-client-id",
          "x-datafn-mutation-id",
          "x-datafn-public-link-token",
          "x-datafn-schema-hash",
          "x-datafn-sync-cursor",
          "x-filefn-client-version",
          "x-idempotency-key",
          "idempotency-key",
          "x-upload-session-token",
          "mcp-protocol-version"
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
          "x-datafn-region",
          "content-disposition",
          "content-range",
          "etag",
          "location",
          "idempotent-replayed",
          "www-authenticate",
          "allow",
          "retry-after"
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
  registerAccountFileRoutes({ app, getFileFn });
  const interfaceServices: InterfaceApiServices = {
    authenticate: (request) => auth.provider.authenticate(request),
    getSyncServer,
    regionId,
    idempotencyStore: services.infra.stores.atomicKv,
    getSearchIndex: () => services.getSyncSearchIndex?.(),
    readStored: services.readSyncRecord,
    findStored: services.findSyncRecords,
    inWriteTransaction: services.inSyncWriteTransaction,
    logError: (message, failure) => logger.error(message, { failure })
  };
  registerInterfaceApiRoutes({ app, services: interfaceServices });
  registerInterfaceMcpRoutes({ app, services: interfaceServices, allowedOrigins: corsOrigins });
  registerAccountAuthRoutes({ app, auth });
}

export function createApp(input: CreateAccountAppInput): Hono {
  const app = new Hono();
  registerCoreRoutes(app, buildAccountServices(input));
  return app;
}

async function resolveFileFn(
  infra: AccountInfra,
  regionId: string,
  auth: AuthFnServer
): Promise<FileFn | null> {
  const files = infra.files;
  const storage = files?.storage(regionId);
  if (!files || !storage) {
    return null;
  }
  return createAccountFileFn({
    auth,
    database: await resolveSyncDatabase(files.database),
    storage,
    stores: infra.stores,
    runtime: files.runtime,
    processing: await files.processing?.()
  });
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
