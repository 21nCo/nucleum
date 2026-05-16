import {
  createAuthFnRegionalClient,
  type AuthFnCachedRegion,
  type AuthFnClientRequestMetric,
  type AuthFnRegionalClient,
  type AuthFnRegionStorage
} from "@authfn/client";
import { clientStorage } from "@21n/persistence/persistence.utils";
import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { resolveAccountBaseUrl, resolveAccountCookiePrefix } from "../network";
import { logger } from "@21n/components/debug/logger.client";
import { isExtensionEnvironment } from "@21n/utils/browser.utils";

type StoredRegionValue = string | AuthFnCachedRegion;

const authClientsMap: Map<string, AuthFnRegionalClient> = new Map();
const REGION_CACHE_TTL_MS = 15 * 60 * 1000;

export const authClient = async (params?: {
  region?: string;
  isPreventCachedInstance?: boolean;
}): Promise<AuthFnRegionalClient> => {
  const region =
    params?.region ??
    (await clientStorage.get(ClientStorageKey.REGION)) ??
    "insouth";
  const cacheKey = "regional";
  if (authClientsMap.has(cacheKey) && !params?.isPreventCachedInstance) {
    const existing = authClientsMap.get(cacheKey) as AuthFnRegionalClient;
    existing.setCurrentRegionId(region);
    return existing;
  }

  const client = createAuthFnRegionalClient({
    defaultRegionId: region,
    resolveBaseUrl: resolveAuthFnBaseUrl,
    storage: createNucleusRegionStorage(),
    cacheTtlMs: REGION_CACHE_TTL_MS,
    clientOptions: {
      cookiePrefix: resolveAccountCookiePrefix(region),
      credentials: "include",
      bearerToken: shouldUseAuthFnBearerSession()
        ? async () =>
            (await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN)) ?? undefined
        : undefined,
      onRequestMetric: emitAccountNetworkMetric
    },
    onRegionChanged: async (event) => {
      await clientStorage.set(ClientStorageKey.REGION, event.toRegionId);
    }
  });
  client.setCurrentRegionId(region);
  authClientsMap.set(cacheKey, client);
  return client;
};

export function resolveAuthFnBaseUrl(region: string) {
  return `${resolveAccountBaseUrl(region).replace(/\/$/, "")}/auth`;
}

export function shouldUseAuthFnBearerSession(): boolean {
  if (typeof window === "undefined") return false;
  return import.meta.env?.VITE_NATIVE_EMBED === "true" || isExtensionEnvironment();
}

export function resolveAuthFnSessionMode(): "cookie" | "hybrid" {
  return shouldUseAuthFnBearerSession() ? "hybrid" : "cookie";
}

export async function bootstrapNucleusAccount(region: string) {
  if (!shouldUseAuthFnBearerSession()) {
    return { kind: "not-authfn" as const };
  }
  const token = await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN);
  if (!token) {
    return { kind: "not-authfn" as const };
  }

  try {
    const response = await fetch(`${resolveAuthFnBaseUrl(region)}/nucleus/bootstrap`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ region })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok || !result.data?.session) {
      return {
        kind: "failed" as const,
        status: response.status,
        error: result?.error
      };
    }

    return {
      kind: "success" as const,
      token,
      session: result.data.session
    };
  } catch (error) {
    return {
      kind: "failed" as const,
      status: 0,
      error
    };
  }
}

function emitAccountNetworkMetric(metric: AuthFnClientRequestMetric) {
  if (!shouldEmitAccountLatencyMetric()) return;
  logger.debug({
    at: "authfn.account.network",
    method: metric.method,
    path: metric.path,
    status: metric.status,
    ok: metric.ok,
    durationMs: round(metric.durationMs),
    requestId: metric.requestId,
    serverTiming: metric.serverTiming,
    dbDurationMs: metric.dbDurationMs,
    dbCallCount: metric.dbCallCount,
    dbMaxDurationMs: metric.serverTiming?.match(/dbmax;dur=([0-9.]+)/)?.[1],
    cacheDurationMs: metric.cacheDurationMs,
    cacheCallCount: metric.cacheCallCount,
    lookupDurationMs: metric.lookupDurationMs,
    lookupCallCount: metric.lookupCallCount,
    workerColo: metric.workerColo,
    accountRegion: metric.accountRegion,
    error: metric.error
  });
}

function shouldEmitAccountLatencyMetric(): boolean {
  if (import.meta.env?.VITE_ACCOUNT_LATENCY_DEBUG === "true") return true;
  if (typeof window === "undefined") return false;
  return window.localStorage?.getItem("accountLatencyDebug") === "true";
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function performSessionCheck(): Promise<boolean | undefined> {
  if (typeof window === "undefined") return false;
  const shouldUseBearerSession = shouldUseAuthFnBearerSession();
  const authFnToken = shouldUseBearerSession
    ? (await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN)) ?? undefined
    : undefined;
  const offlineSessionId =
    (await clientStorage.get(ClientStorageKey.OFFLINE_SESSION_ID)) ?? undefined;
  if (!shouldUseBearerSession) {
    await clientStorage.remove(ClientStorageKey.AUTHFN_TOKEN);
  }

  try {
    const client = await authClient({ isPreventCachedInstance: true });
    const session = await client.getSession();
    if (!session.ok) {
      logger.warn({
        at: "performSessionCheck.session.failed",
        hasAuthFnToken: Boolean(authFnToken),
        hasOfflineSession: Boolean(offlineSessionId),
        error: session.error,
        currentPath: window.location.pathname
      });
      return Boolean(offlineSessionId && !authFnToken);
    }
    if (session.data.session) {
      await clientStorage.set(ClientStorageKey.USER, session.data.session);
      if (session.data.session.primaryEmail) {
        await client.resolveRegion({
          identifier: session.data.session.primaryEmail
        });
      }
    }
    logger.info({
      at: "performSessionCheck.session.result",
      hasAuthFnToken: Boolean(authFnToken),
      hasOfflineSession: Boolean(offlineSessionId),
      hasSession: Boolean(session.data.session),
      regionId: session.data.session?.regionId,
      currentPath: window.location.pathname
    });
    return Boolean(session.data.session) || Boolean(offlineSessionId && !authFnToken);
  } catch (error) {
    logger.error({ at: "performSessionCheck.exception", error });
    return offlineSessionId && !authFnToken ? true : undefined;
  }
}

function createNucleusRegionStorage(): AuthFnRegionStorage {
  return {
    async get(identifier) {
      const map = await readRegionMap();
      const value = map[normalizeIdentifier(identifier)];
      if (!value) return null;
      return typeof value === "string"
        ? regionValueFromLegacyString(identifier, value)
        : value;
    },
    async set(identifier, value) {
      const map = await readRegionMap();
      map[normalizeIdentifier(identifier)] = value;
      await clientStorage.set(ClientStorageKey.USER_REGION_MAP, map);
    },
    async delete(identifier) {
      const map = await readRegionMap();
      delete map[normalizeIdentifier(identifier)];
      await clientStorage.set(ClientStorageKey.USER_REGION_MAP, map);
    }
  };
}

async function readRegionMap(): Promise<Record<string, StoredRegionValue>> {
  const raw = (await clientStorage.get(ClientStorageKey.USER_REGION_MAP)) ?? "{}";
  if (typeof raw === "object" && raw !== null) {
    return raw as Record<string, StoredRegionValue>;
  }
  try {
    return JSON.parse(raw) as Record<string, StoredRegionValue>;
  } catch {
    return {};
  }
}

function regionValueFromLegacyString(
  identifier: string,
  regionId: string
): AuthFnCachedRegion {
  const normalized = normalizeIdentifier(identifier);
  return {
    identifier: normalized,
    regionId,
    authority: resolveAccountBaseUrl(regionId),
    cachedAt: Date.now(),
    expiresAt: Date.now() + REGION_CACHE_TTL_MS
  };
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}
