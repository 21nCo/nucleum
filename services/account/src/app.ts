import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Adapter, KVStoreAdapter } from '@superfunctions/db';
import type {
  AuthFnDeliveryProvider,
  AuthFnEvent,
  AuthFnMultiRegionRegionConfig,
  AuthFnRegionLookupStore,
  AuthFnSocialProviderConfig,
  SocialOAuthPluginConfig
} from '@authfn/core';
import type { Logger } from '@logfn/core';
import { createAccountAuth } from './auth.js';
import { createSendFnDeliveryProvider } from './email/sendfn.js';
import { createAccountRateLimitMiddleware } from './security/rate-limit.js';
import { sendAccountDebugLog } from './debug-sink.js';
import type { AccountLatencyMetrics, AccountLatencySnapshot } from './observability/latency.js';

export interface AccountTestControlSurface {
  getOutboxMessages(): unknown[];
  getEvents(): unknown[];
  reset(): Promise<void> | void;
}

export interface CreateAccountAppInput {
  database: Adapter;
  cacheStore: KVStoreAdapter;
  logger: Logger;
  delivery?: AuthFnDeliveryProvider;
  lookupStore?: AuthFnRegionLookupStore;
  regions?: AuthFnMultiRegionRegionConfig[];
  oauthProviders?: Partial<Record<'google' | 'apple', AuthFnSocialProviderConfig | undefined>>;
  oauthPlugin?: Omit<SocialOAuthPluginConfig, 'providers'>;
  rateLimiter?: false | ReturnType<typeof createAccountRateLimitMiddleware>;
  securityEventSink?: (event: AuthFnEvent) => Promise<void> | void;
  corsOrigins?: string[];
  enableTestControlRoutes?: boolean;
  testControl?: AccountTestControlSurface;
  latencyMetrics?: AccountLatencyMetrics;
  workerColo?: string;
}

export function createAccountApp(input: CreateAccountAppInput): Hono {
  const app = new Hono();
  const corsOrigins = withNativeEmbedOrigins(input.corsOrigins ?? readCsv(process.env.ACCOUNT_CORS_ORIGINS));
  const auth = createAccountAuth({
    database: input.database,
    cacheStore: input.cacheStore,
    delivery: input.delivery ?? createSendFnDeliveryProvider({
      database: input.database,
      logger: input.logger
    }),
    logger: input.logger,
    regions: input.regions,
    lookupStore: input.lookupStore,
    oauthProviders: input.oauthProviders,
    oauthPlugin: input.oauthPlugin,
    securityEventSink: input.securityEventSink
  });

  if (corsOrigins.length > 0) {
    app.use('*', cors({
      origin: (origin) => corsOrigins.includes(origin) ? origin : null,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['content-type', 'authorization', 'x-authfn-csrf', 'x-request-id'],
      exposeHeaders: [
        'x-request-id',
        'server-timing',
        'x-account-db-call-count',
        'x-account-db-duration-ms',
        'x-account-db-max-duration-ms',
        'x-account-cache-call-count',
        'x-account-cache-duration-ms',
        'x-account-lookup-call-count',
        'x-account-lookup-duration-ms',
        'x-account-region',
        'x-account-worker-colo',
      ],
      credentials: true,
      maxAge: 600
    }));
  }

  app.use('*', async (c, next) => {
    const start = now();
    await next();
    const path = new URL(c.req.url).pathname;
    const durationMs = now() - start;
    const latency = input.latencyMetrics?.finish(durationMs);
    attachLatencyHeaders(c.res.headers, latency, input);
    input.logger.info('account request', {
      method: c.req.method,
      path,
      status: c.res.status,
      durationMs,
      dbCallCount: latency?.dbCallCount,
      dbDurationMs: latency?.dbDurationMs,
      dbMaxDurationMs: latency?.dbMaxDurationMs,
      cacheCallCount: latency?.cacheCallCount,
      cacheDurationMs: latency?.cacheDurationMs,
      lookupCallCount: latency?.lookupCallCount,
      lookupDurationMs: latency?.lookupDurationMs,
      workerColo: input.workerColo
    });
    if (
      c.res.status >= 400
      || path.includes('/auth/social/callback/')
      || process.env.ACCOUNT_LATENCY_DEBUG === 'true'
    ) {
      sendAccountDebugLog({
        level: c.res.status >= 500 ? 'error' : c.res.status >= 400 ? 'warn' : 'info',
        route: path,
        message: 'account request',
        payload: {
          method: c.req.method,
          path,
          status: c.res.status,
          durationMs,
          latency: process.env.ACCOUNT_LATENCY_DEBUG === 'true'
            ? redactLatencyDetails(latency)
            : latency
              ? {
                  dbCallCount: latency.dbCallCount,
                  dbDurationMs: round(latency.dbDurationMs),
                  dbMaxDurationMs: round(latency.dbMaxDurationMs),
                  cacheCallCount: latency.cacheCallCount,
                  cacheDurationMs: round(latency.cacheDurationMs),
                  lookupCallCount: latency.lookupCallCount,
                  lookupDurationMs: round(latency.lookupDurationMs)
                }
              : undefined,
          workerColo: input.workerColo
        },
        requestId: c.res.headers.get('x-request-id') ?? undefined,
        tags: ['account-request']
      });
    }
  });

  if (input.rateLimiter !== false) {
    app.use('/auth/*', input.rateLimiter ?? createAccountRateLimitMiddleware(input.cacheStore, {
      emit: input.securityEventSink
    }));
  }

  app.get('/health', (c) => c.json({
    ok: true,
    service: 'nucleus-account'
  }));

  app.get('/openapi.json', (c) => c.json(auth.openApi?.() ?? {}));

  if (input.enableTestControlRoutes) {
    installTestControlRoutes(app, input.testControl);
  }

  app.all('/auth/*', async (c) => auth.router.handle(c.req.raw));

  return app;
}

function attachLatencyHeaders(
  headers: Headers,
  latency: AccountLatencySnapshot | undefined,
  input: CreateAccountAppInput
): void {
  if (!latency) {
    return;
  }

  headers.set('server-timing', [
    `app;dur=${round(latency.totalDurationMs)}`,
    `db;dur=${round(latency.dbDurationMs)}`,
    `dbmax;dur=${round(latency.dbMaxDurationMs)}`,
    `dbcount;desc="${latency.dbCallCount}"`,
    `cache;dur=${round(latency.cacheDurationMs)}`,
    `lookup;dur=${round(latency.lookupDurationMs)}`
  ].join(', '));
  headers.set('x-account-db-call-count', String(latency.dbCallCount));
  headers.set('x-account-db-duration-ms', String(round(latency.dbDurationMs)));
  headers.set('x-account-db-max-duration-ms', String(round(latency.dbMaxDurationMs)));
  headers.set('x-account-cache-call-count', String(latency.cacheCallCount));
  headers.set('x-account-cache-duration-ms', String(round(latency.cacheDurationMs)));
  headers.set('x-account-lookup-call-count', String(latency.lookupCallCount));
  headers.set('x-account-lookup-duration-ms', String(round(latency.lookupDurationMs)));
  headers.set('x-account-region', process.env.ACCOUNT_REGION_ID ?? '');
  if (input.workerColo) {
    headers.set('x-account-worker-colo', input.workerColo);
  }
}

function redactLatencyDetails(latency: AccountLatencySnapshot | undefined): AccountLatencySnapshot | undefined {
  if (!latency) {
    return undefined;
  }

  return {
    ...latency,
    totalDurationMs: round(latency.totalDurationMs),
    dbDurationMs: round(latency.dbDurationMs),
    dbMaxDurationMs: round(latency.dbMaxDurationMs),
    storageCalls: latency.storageCalls.map((call) => ({
      ...call,
      durationMs: round(call.durationMs)
    }))
  };
}

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function withNativeEmbedOrigins(origins: string[]): string[] {
  return Array.from(new Set([
    ...origins,
    'tauri://localhost'
  ]));
}

function readCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function installTestControlRoutes(app: Hono, control: AccountTestControlSurface | undefined): void {
  app.get('/__test/outbox/latest', (c) => {
    const identifier = c.req.query('identifier')?.trim().toLowerCase();
    const messages = control?.getOutboxMessages() ?? [];
    const matched = identifier
      ? messages.filter((message) => {
          const record = message as { email?: unknown; to?: unknown; identifier?: unknown };
          const value = typeof record.email === 'string'
            ? record.email
            : typeof record.to === 'string'
              ? record.to
              : typeof record.identifier === 'string'
                ? record.identifier
                : undefined;
          return value?.trim().toLowerCase() === identifier;
        })
      : messages;

    return c.json({
      ok: true,
      message: matched.at(-1) ?? null
    });
  });

  app.get('/__test/events', (c) => c.json({
    ok: true,
    events: control?.getEvents() ?? []
  }));

  app.post('/__test/reset', async (c) => {
    await control?.reset();
    return c.json({
      ok: true
    });
  });
}
