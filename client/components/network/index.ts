import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { clientStorage } from "@21n/persistence/persistence.utils";

export function resolveHost() {
  const nativeWebOrigin = resolveNativeConfigUrl("webOrigin");
  if (nativeWebOrigin) return nativeWebOrigin.hostname;

  if (
    typeof window !== "undefined" &&
    (window.location.protocol === "http:" ||
      window.location.protocol === "https:")
  ) {
    return window.location.hostname;
  }
  return (
    import.meta.env?.VITE_HOST ??
    (typeof window !== "undefined" ? window.location.hostname : "localhost")
  );
}

export function resolveAccountBaseUrl(region: string) {
  const nativeAccountBaseUrl = resolveNativeAccountBaseUrl(region);
  if (nativeAccountBaseUrl) {
    return nativeAccountBaseUrl;
  }

  const regionalTemplate = import.meta.env?.VITE_ACCOUNT_BASE_URL_TEMPLATE;
  if (regionalTemplate) {
    return renderAccountBaseUrlTemplate(regionalTemplate, region);
  }

  const explicitBaseUrl = import.meta.env?.VITE_ACCOUNT_BASE_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  const host = resolveHost().toLowerCase();
  if (isLoopbackHost(host)) {
    return "http://localhost:3000";
  }

  const accountEnv = resolveAccountEnvironment(host);
  const accountDomain = import.meta.env?.VITE_ACCOUNT_DOMAIN ?? "nucleum.app";
  const normalizedRegion = normalizeAccountRegion(region);
  const envSuffix = accountEnv === "live" ? "" : `-${accountEnv}`;
  return `https://account-${normalizedRegion}${envSuffix}.${accountDomain}`;
}

export function resolveAccountCookiePrefix(region = "insouth") {
  const configured = import.meta.env?.VITE_ACCOUNT_COOKIE_PREFIX?.trim();
  if (configured) return configured;

  const baseUrl = resolveAccountBaseUrl(region);
  const accountEnv = resolveAccountEnvironmentFromAccountBaseUrl(baseUrl);
  if (accountEnv === "local") return "nucleus_local";
  if (accountEnv === "pre") return "nucleus_pre";
  return "nucleus";
}

export async function peformAccountApiCall(
  path: string,
  body: any,
  params?: {
    method?: "POST" | "GET" | "PUT" | "DELETE" | "HEAD";
    region?: string;
    headers?: any;
  }
) {
  const region =
    params?.region ?? (await clientStorage.get(ClientStorageKey.REGION));
  const baseUrl = resolveAccountBaseUrl(region ?? "insouth");
  const method = params?.method ?? "POST";
  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(params?.headers ?? {})
    }
  };

  if (method !== "GET" && method !== "HEAD") {
    fetchOptions.body = JSON.stringify(body);
  }

  return fetch(baseUrl + "/" + path, fetchOptions);
}

function resolveNativeConfigUrl(key: "webOrigin" | "accountUrl") {
  if (typeof window === "undefined") return null;
  const value = window.__NUCLEUM_NATIVE_CONFIG__?.[key];
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function resolveNativeAccountBaseUrl(region: string) {
  const nativeConfig = typeof window === "undefined" ? null : window.__NUCLEUM_NATIVE_CONFIG__;
  if (nativeConfig?.environment && nativeConfig.accountDomain) {
    const environment = nativeConfig.environment.trim().toLowerCase();
    const normalizedRegion = normalizeAccountRegion(region || nativeConfig.defaultRegion);
    const suffix = environment === "live" ? "" : `-${environment}`;
    return `https://account-${normalizedRegion}${suffix}.${nativeConfig.accountDomain}`;
  }

  const nativeAccountUrl = resolveNativeConfigUrl("accountUrl");
  if (!nativeAccountUrl) return null;

  return nativeAccountUrl.toString().replace(/\/$/, "");
}

function renderAccountBaseUrlTemplate(template: string, region: string) {
  const normalizedRegion = normalizeAccountRegion(region);
  const accountEnv = resolveAccountEnvironment();
  const accountDomain = import.meta.env?.VITE_ACCOUNT_DOMAIN ?? "nucleum.app";
  const envSuffix = accountEnv === "live" ? "" : `-${accountEnv}`;

  return template
    .replaceAll("{region}", normalizedRegion)
    .replaceAll("{env}", accountEnv)
    .replaceAll("{envSuffix}", envSuffix)
    .replaceAll("{domain}", accountDomain)
    .replace(/\/$/, "");
}

function resolveAccountEnvironmentFromAccountBaseUrl(baseUrl: string): AccountEnvironment {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    if (hostname.startsWith("account-") || hostname.includes(".account-")) {
      if (hostname.includes("-local.")) return "local";
      if (hostname.includes("-pre.")) return "pre";
      if (hostname.includes("-dev.")) return "dev";
      return "live";
    }
  } catch {
    // Fall through to the web/native environment resolver.
  }
  return resolveAccountEnvironment();
}

export type AccountEnvironment = "local" | "dev" | "pre" | "live";

export function resolveAccountEnvironment(host = resolveHost()): AccountEnvironment {
  const normalizedHost = host.toLowerCase();
  const subdomain = normalizedHost.split(".")[0] ?? "";
  if (subdomain === "local" || normalizedHost.endsWith(".localhost")) {
    return "local";
  }
  if (subdomain === "dev") {
    return "dev";
  }
  if (subdomain === "pre") {
    return "pre";
  }
  if (subdomain === "web" || subdomain === "app") {
    return "live";
  }

  const configured = (import.meta.env?.VITE_ENV ?? "").trim().toLowerCase();
  if (configured === "pre") {
    return "pre";
  }
  if (configured === "local" || configured === "dev" || configured === "live") {
    return configured;
  }
  return "dev";
}

function normalizeAccountRegion(region: string | undefined): string {
  return region?.trim().toLowerCase() || "insouth";
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
}
