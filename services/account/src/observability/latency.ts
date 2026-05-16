import type { Adapter, KVStoreAdapter } from '@superfunctions/db';
import type { AuthFnRegionLookupStore } from '@authfn/core';

export type AccountStorageKind = 'db' | 'cache' | 'lookup';

export interface AccountStorageCallMetric {
  kind: AccountStorageKind;
  operation: string;
  model?: string;
  namespace?: string;
  durationMs: number;
  ok: boolean;
}

export interface AccountLatencySnapshot {
  totalDurationMs: number;
  dbCallCount: number;
  dbDurationMs: number;
  dbMaxDurationMs: number;
  cacheCallCount: number;
  cacheDurationMs: number;
  cacheMaxDurationMs: number;
  lookupCallCount: number;
  lookupDurationMs: number;
  lookupMaxDurationMs: number;
  storageCalls: AccountStorageCallMetric[];
}

export interface AccountLatencyMetrics {
  recordStorageCall(metric: AccountStorageCallMetric): void;
  finish(totalDurationMs: number): AccountLatencySnapshot;
}

export function createAccountLatencyMetrics(): AccountLatencyMetrics {
  const storageCalls: AccountStorageCallMetric[] = [];

  return {
    recordStorageCall(metric) {
      storageCalls.push(metric);
    },
    finish(totalDurationMs) {
      const dbCalls = storageCalls.filter((call) => call.kind === 'db');
      const cacheCalls = storageCalls.filter((call) => call.kind === 'cache');
      const lookupCalls = storageCalls.filter((call) => call.kind === 'lookup');
      const dbDurationMs = dbCalls.reduce((sum, call) => sum + call.durationMs, 0);
      const dbMaxDurationMs = dbCalls.reduce((max, call) => Math.max(max, call.durationMs), 0);
      const cacheDurationMs = cacheCalls.reduce((sum, call) => sum + call.durationMs, 0);
      const cacheMaxDurationMs = cacheCalls.reduce((max, call) => Math.max(max, call.durationMs), 0);
      const lookupDurationMs = lookupCalls.reduce((sum, call) => sum + call.durationMs, 0);
      const lookupMaxDurationMs = lookupCalls.reduce((max, call) => Math.max(max, call.durationMs), 0);
      return {
        totalDurationMs,
        dbCallCount: dbCalls.length,
        dbDurationMs,
        dbMaxDurationMs,
        cacheCallCount: cacheCalls.length,
        cacheDurationMs,
        cacheMaxDurationMs,
        lookupCallCount: lookupCalls.length,
        lookupDurationMs,
        lookupMaxDurationMs,
        storageCalls: [...storageCalls],
      };
    },
  };
}

export function observeAdapter(adapter: Adapter, metrics: AccountLatencyMetrics): Adapter {
  return new Proxy(adapter, {
    get(target, property, receiver) {
      if (property === 'internal') {
        return observeInternalCrud(Reflect.get(target, property, receiver), metrics);
      }

      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return async (...args: unknown[]) => {
        const startedAt = now();
        try {
          const result = await value.apply(target, args);
          recordStorageCall(metrics, 'db', String(property), args[0], startedAt, true);
          return result;
        } catch (error) {
          recordStorageCall(metrics, 'db', String(property), args[0], startedAt, false);
          throw error;
        }
      };
    },
  }) as Adapter;
}

export function observeKVStore(store: KVStoreAdapter, metrics: AccountLatencyMetrics): KVStoreAdapter {
  return new Proxy(store, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return async (...args: unknown[]) => {
        const startedAt = now();
        try {
          const result = await value.apply(target, args);
          recordStorageCall(metrics, 'cache', String(property), args[0], startedAt, true);
          return result;
        } catch (error) {
          recordStorageCall(metrics, 'cache', String(property), args[0], startedAt, false);
          throw error;
        }
      };
    },
  }) as KVStoreAdapter;
}

export function observeLookupStore(
  store: AuthFnRegionLookupStore,
  metrics: AccountLatencyMetrics,
): AuthFnRegionLookupStore {
  return new Proxy(store, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return async (...args: unknown[]) => {
        const startedAt = now();
        try {
          const result = await value.apply(target, args);
          recordStorageCall(metrics, 'lookup', String(property), args[0], startedAt, true);
          return result;
        } catch (error) {
          recordStorageCall(metrics, 'lookup', String(property), args[0], startedAt, false);
          throw error;
        }
      };
    },
  }) as AuthFnRegionLookupStore;
}

function observeInternalCrud(internal: unknown, metrics: AccountLatencyMetrics): unknown {
  if (!internal || typeof internal !== 'object') {
    return internal;
  }

  return new Proxy(internal, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return async (...args: unknown[]) => {
        const startedAt = now();
        try {
          const result = await value.apply(target, args);
          recordStorageCall(metrics, 'db', `internal.${String(property)}`, args[0], startedAt, true);
          return result;
        } catch (error) {
          recordStorageCall(metrics, 'db', `internal.${String(property)}`, args[0], startedAt, false);
          throw error;
        }
      };
    },
  });
}

function recordStorageCall(
  metrics: AccountLatencyMetrics,
  kind: AccountStorageKind,
  operation: string,
  firstArg: unknown,
  startedAt: number,
  ok: boolean,
): void {
  const params = firstArg && typeof firstArg === 'object'
    ? firstArg as { model?: unknown; namespace?: unknown }
    : {};
  metrics.recordStorageCall({
    kind,
    operation,
    model: typeof params.model === 'string'
      ? params.model
      : typeof firstArg === 'string'
        ? firstArg
      : undefined,
    namespace: typeof params.namespace === 'string' ? params.namespace : undefined,
    durationMs: now() - startedAt,
    ok,
  });
}

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
