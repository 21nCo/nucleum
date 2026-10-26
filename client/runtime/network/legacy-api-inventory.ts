import { logger } from "@nucleum/client/runtime/logging/logger";

export type LegacyApiInventoryContext = {
  at: "legacyApi.inventory";
  endpoint?: string;
  operation?: string;
  method: "POST" | "GET" | "PUT" | "DELETE";
  urlOrigin?: string;
  urlHost?: string;
  urlPath?: string;
  isFileApi: boolean;
  hasAuthToken: boolean;
  callsite?: string;
};

type LegacyApiInventoryEntry = LegacyApiInventoryContext & {
  event: "request" | "response" | "error";
  durationMs: number;
  status?: number;
  ok?: boolean;
  error?: {
    name?: string;
    message: string;
  };
  t: string;
};

const legacyApiInventory: LegacyApiInventoryEntry[] = [];

/** Builds redacted diagnostic context for a legacy API operation. */
export function resolveLegacyApiInventoryContext(
  params: {
    url: string;
    method: "POST" | "GET" | "PUT" | "DELETE";
    body: any;
    authToken?: string | null;
    legacyApi?: {
      endpoint?: string;
      isFileApi?: boolean;
    };
  },
  token: string | null | undefined
): LegacyApiInventoryContext | undefined {
  if (!params.legacyApi) return;
  const urlParts = resolveInventoryUrlParts(params.url);
  return {
    at: "legacyApi.inventory",
    endpoint: params.legacyApi.endpoint,
    operation: resolveLegacyOperation(params.body),
    method: params.method,
    urlOrigin: urlParts.origin,
    urlHost: urlParts.host,
    urlPath: urlParts.pathname,
    isFileApi: Boolean(params.legacyApi.isFileApi),
    hasAuthToken: Boolean(token),
    callsite: resolveInventoryCallsite()
  };
}

/** Records a bounded diagnostic entry without retaining request credentials. */
export function recordLegacyApiInventory(
  entry: Omit<LegacyApiInventoryEntry, "t"> | undefined
) {
  if (!entry) return;
  const timestampedEntry = { ...entry, t: new Date().toISOString() };
  logger.debug(timestampedEntry);
  legacyApiInventory.push(timestampedEntry);
  legacyApiInventory.splice(0, Math.max(0, legacyApiInventory.length - 500));
  if (typeof window === "undefined" || import.meta.env.MODE !== "test") return;
  const inventoryWindow = window as Window & {
    __getLegacyApiInventory?: () => LegacyApiInventoryEntry[];
  };
  inventoryWindow.__getLegacyApiInventory = () => [...legacyApiInventory];
}

function resolveLegacyOperation(body: any) {
  const parsedBody = typeof body === "string" ? parseInventoryBody(body) : body;
  if (!parsedBody || typeof parsedBody !== "object") return undefined;
  const bodyRecord = parsedBody as Record<string, unknown>;
  const value = bodyRecord.action ?? bodyRecord.method;
  return typeof value === "string" ? value : undefined;
}

function parseInventoryBody(body: string) {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function resolveInventoryUrlParts(url: string) {
  try {
    const parsedUrl = new URL(url);
    return {
      origin: parsedUrl.origin,
      host: parsedUrl.host,
      pathname: parsedUrl.pathname
    };
  } catch {
    return {
      origin: undefined,
      host: undefined,
      pathname: url.split("?")[0]
    };
  }
}

function resolveInventoryCallsite() {
  const stack = new Error().stack;
  if (!stack) return undefined;
  return stack
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !line.includes("resolveInventoryCallsite") &&
        !line.includes("resolveLegacyApiInventoryContext") &&
        !line.includes("performHttpNetworkOperation") &&
        !line.includes("performApiCall")
    );
}

/** Serializes the name and message of a diagnostic error. */
export function serializeInventoryError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }
  return { message: String(error) };
}
