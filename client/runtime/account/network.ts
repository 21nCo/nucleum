/**
 * Shared Cloudflare zone for deployed dev hosts. Dev uses single-label hosts
 * on this zone: `<product>.21n.dev` (web) and
 * `<product>-account-<region>.21n.dev` (account service).
 */
export const DEV_HOST_ZONE = "21n.dev";

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

  const devProduct = resolveDevZoneProduct(host);
  const devBaseUrl = devProduct ? devAccountBaseUrl(devProduct, region) : null;
  if (devBaseUrl) {
    return devBaseUrl;
  }

  const accountEnv = resolveAccountEnvironment(host);
  const accountDomain = resolveAccountDomain(host);
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
  const [{ ClientStorageKey }, { clientStorage }] = await Promise.all([
    import("@nucleum/persistence/persistence.type"),
    import("@nucleum/persistence/client-storage")
  ]);
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
  const nativeConfig =
    typeof window === "undefined" ? null : window.__NUCLEUM_NATIVE_CONFIG__;
  if (nativeConfig?.environment) {
    const environment = nativeConfig.environment.trim().toLowerCase();
    const normalizedRegion = normalizeAccountRegion(
      region || nativeConfig.defaultRegion
    );
    const accountDomain =
      nativeConfig.accountDomain?.trim() ||
      resolveAccountDomainFromProduct(nativeConfig.product);
    const devBaseUrl =
      environment === "dev"
        ? devAccountBaseUrl(accountDomain.replace(/^\./, "").split(".")[0], normalizedRegion)
        : null;
    if (devBaseUrl) {
      return devBaseUrl;
    }
    const suffix = environment === "live" ? "" : `-${environment}`;
    return `https://account-${normalizedRegion}${suffix}.${accountDomain}`;
  }

  const nativeAccountUrl = resolveNativeConfigUrl("accountUrl");
  if (!nativeAccountUrl) return null;

  return nativeAccountUrl.toString().replace(/\/$/, "");
}

function renderAccountBaseUrlTemplate(template: string, region: string) {
  const normalizedRegion = normalizeAccountRegion(region);
  const accountEnv = resolveAccountEnvironment();
  const accountDomain = resolveAccountDomain();
  const envSuffix = accountEnv === "live" ? "" : `-${accountEnv}`;

  return template
    .replaceAll("{region}", normalizedRegion)
    .replaceAll("{env}", accountEnv)
    .replaceAll("{envSuffix}", envSuffix)
    .replaceAll("{domain}", accountDomain)
    .replace(/\/$/, "");
}

function resolveAccountEnvironmentFromAccountBaseUrl(
  baseUrl: string
): AccountEnvironment {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    if (isDevZoneAccountHost(hostname)) return "dev";
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

export function resolveAccountEnvironment(
  host = resolveHost()
): AccountEnvironment {
  const normalizedHost = host.toLowerCase();
  const subdomain =
    normalizedHost.split(".")[0] ?? "";
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

export function resolveAccountDomain(host = resolveHost()): string {
  const configured = import.meta.env?.VITE_ACCOUNT_DOMAIN?.trim();
  if (configured) return configured.replace(/^\./, "");

  return resolveProductDomainFromHost(host) ?? "nucleum.app";
}

function resolveProductDomainFromHost(host: string): string | null {
  const normalized = host.toLowerCase().replace(/:\d+$/, "");
  if (isLoopbackHost(normalized)) return null;

  const labels = normalized
    .split(".")
    .filter(Boolean);
  if (labels.length < 2) return null;

  const first = labels[0];
  if (["local", "dev", "pre", "web", "app"].includes(first)) {
    return labels.slice(1).join(".");
  }

  if (first.startsWith("account-")) {
    return labels.slice(1).join(".");
  }

  return labels.slice(-2).join(".");
}

const DEV_HOST_LABEL = /^[a-z0-9]+$/;

/**
 * Builds `https://<product>-account-<region>.21n.dev`, or returns null when the
 * product is not a plain host label. Non-label regions fall back to `insouth`.
 */
function devAccountBaseUrl(product: string, region: string | undefined): string | null {
  const normalizedProduct = product.trim().toLowerCase();
  if (!DEV_HOST_LABEL.test(normalizedProduct)) {
    return null;
  }
  const candidateRegion = normalizeAccountRegion(region);
  const normalizedRegion = DEV_HOST_LABEL.test(candidateRegion) ? candidateRegion : "insouth";
  return `https://${normalizedProduct}-account-${normalizedRegion}.${DEV_HOST_ZONE}`;
}

function isDevZoneAccountHost(hostname: string): boolean {
  return (
    hostname.endsWith(`.${DEV_HOST_ZONE}`) &&
    /^[a-z0-9]+-account-[a-z0-9]+$/.test(hostname.slice(0, -DEV_HOST_ZONE.length - 1))
  );
}

/** Returns the product label for a dev web host such as `memotron.21n.dev`. */
function resolveDevZoneProduct(host: string): string | null {
  const normalized = host.toLowerCase().replace(/:\d+$/, "");
  if (!normalized.endsWith(`.${DEV_HOST_ZONE}`)) return null;
  const label = normalized.slice(0, -DEV_HOST_ZONE.length - 1);
  return DEV_HOST_LABEL.test(label) ? label : null;
}

function resolveAccountDomainFromProduct(product: string | undefined): string {
  const normalized = product?.trim().toLowerCase().replace(/^\./, "");
  return normalized || "nucleum.app";
}

/** Normalizes a region id, falling back to `insouth` for empty or non-label values. */
function normalizeAccountRegion(region: string | undefined): string {
  const normalized = region?.trim().toLowerCase() ?? "";
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : "insouth";
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
}
