import type { Hono } from 'hono';
import type {
  AuthFnEvent,
  AuthFnMultiRegionRegionConfig,
  AuthFnRegionLookupStore
} from '@authfn/core';
import { memoryAdapter } from '@superfunctions/db/adapters/memory';
import { createInMemoryKVStore } from '@superfunctions/middleware';
import type { Adapter, KVStoreAdapter } from '@superfunctions/db';
import { createAccountApp, type AccountTestControlSurface } from '../app.js';
import { createCapturingDeliveryProvider } from './outbox.js';
import type { CapturingDeliveryProvider } from './outbox.js';
import { createCapturedLogger } from './logger.js';
import { createInMemoryRegionLookupStore } from './memory-lookup.js';
import type { InMemoryRegionLookupStore } from './memory-lookup.js';
import { createMockOAuthConfig, type MockOAuthConfig } from './oauth.js';

export interface AccountTestHarness {
  app: Hono;
  database: Adapter;
  cacheStore: KVStoreAdapter;
  delivery: CapturingDeliveryProvider;
  lookupStore: InMemoryRegionLookupStore;
  oauth: MockOAuthConfig;
  regions: AuthFnMultiRegionRegionConfig[];
  authEvents(): AuthFnEvent[];
  logEvents(): unknown[];
  reset(): Promise<void>;
}

export interface MultiRegionAccountTestHarness {
  lookupStore: InMemoryRegionLookupStore;
  regions: AuthFnMultiRegionRegionConfig[];
  primary: AccountTestHarness;
  secondary: AccountTestHarness;
  reset(): Promise<void>;
}

export function createAccountTestHarness(input: {
  regionId?: string;
  authority?: string;
  regions?: AuthFnMultiRegionRegionConfig[];
  lookupStore?: AuthFnRegionLookupStore;
  enableRateLimit?: boolean;
  corsOrigins?: string[];
} = {}): AccountTestHarness {
  const regionId = input.regionId ?? 'local';
  const authority = input.authority ?? 'http://127.0.0.1:8787';
  const regions = input.regions ?? [
    {
      regionId,
      authority,
      hosts: [new URL(authority).hostname],
      oauth: {
        google: {
          clientId: 'test-google-client',
          scopes: ['openid', 'email', 'profile']
        },
        apple: {
          clientId: 'test-apple-client',
          scopes: ['name', 'email']
        }
      }
    }
  ];
  const database = memoryAdapter({ debug: false });
  const cacheStore = createInMemoryKVStore();
  const delivery = createCapturingDeliveryProvider();
  const lookupStore = input.lookupStore ?? createInMemoryRegionLookupStore();
  const logger = createCapturedLogger(`nucleus-account-test-${regionId}`);
  const oauth = createMockOAuthConfig({
    returnTo: [`${authority}/auth/callback`, `${authority}/`],
    redirectUris: [`${authority}/auth/social/callback/google`, `${authority}/auth/social/callback/apple`]
  });
  const authEvents: AuthFnEvent[] = [];

  const control: AccountTestControlSurface = {
    getOutboxMessages: () => delivery.messages(),
    getEvents: () => [
      ...authEvents,
      ...logger.events()
    ],
    reset: async () => {
      delivery.clear();
      logger.clear();
      authEvents.length = 0;
      oauth.clear();
      if ('clear' in lookupStore && typeof lookupStore.clear === 'function') {
        lookupStore.clear();
      }
      if ('close' in database && typeof database.close === 'function') {
        await database.close();
      }
    }
  };

  const app = createAccountApp({
    database,
    cacheStore,
    logger: logger.logger,
    delivery,
    lookupStore,
    regions,
    oauthProviders: oauth.oauthProviders,
    oauthPlugin: oauth.oauthPlugin,
    rateLimiter: input.enableRateLimit === false ? false : undefined,
    securityEventSink: (event) => {
      authEvents.push(event);
    },
    corsOrigins: input.corsOrigins,
    enableTestControlRoutes: true,
    testControl: control
  });

  return {
    app,
    database,
    cacheStore,
    delivery,
    lookupStore: lookupStore as InMemoryRegionLookupStore,
    oauth,
    regions,
    authEvents: () => authEvents.map((event) => ({ ...event })),
    logEvents: () => logger.events(),
    reset: async () => {
      await control.reset();
    }
  };
}

export function createMultiRegionAccountHarness(input: {
  primaryAuthority?: string;
  secondaryAuthority?: string;
} = {}): MultiRegionAccountTestHarness {
  const primaryAuthority = input.primaryAuthority ?? 'http://us.account.test';
  const secondaryAuthority = input.secondaryAuthority ?? 'http://eu.account.test';
  const lookupStore = createInMemoryRegionLookupStore();
  const regions: AuthFnMultiRegionRegionConfig[] = [
    {
      regionId: 'us',
      authority: primaryAuthority,
      hosts: [new URL(primaryAuthority).hostname]
    },
    {
      regionId: 'eu',
      authority: secondaryAuthority,
      hosts: [new URL(secondaryAuthority).hostname]
    }
  ];

  const primary = createAccountTestHarness({
    regionId: 'us',
    authority: primaryAuthority,
    regions,
    lookupStore,
    enableRateLimit: false
  });
  const secondary = createAccountTestHarness({
    regionId: 'eu',
    authority: secondaryAuthority,
    regions: [regions[1]!, regions[0]!],
    lookupStore,
    enableRateLimit: false
  });

  return {
    lookupStore,
    regions,
    primary,
    secondary,
    reset: async () => {
      await primary.reset();
      await secondary.reset();
      lookupStore.clear();
    }
  };
}
