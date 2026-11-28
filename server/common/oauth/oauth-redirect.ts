import frontendConfig from "../../../services/frontend/config/environments.json";

/**
 * Redirect handling for the legacy OAuth callback (`/oauth/{provider}`).
 *
 * The OAuth `state` is `<guest>:<domainPart>`, where `domainPart` names the
 * client to return to: a web host, `localredirect.<host>` (desktop) or
 * `<product>_schemeredirect.<host>` (iOS and macOS apps). The session token is
 * only ever sent to a host on the allowlist below, which is built from the
 * product config in `services/frontend/config/environments.json` plus the
 * legacy hosts that predate it. An unknown host never receives a token: the
 * caller is sent to the product's default host instead, without signing in.
 */

type FrontendEnvironment = {
  webSubdomain?: string;
  hosts?: { web?: string };
  buildEnv?: Record<string, string>;
};

type FrontendProduct = {
  domain: string;
  env?: Record<string, Record<string, string>>;
};

type FrontendConfig = {
  products: Record<string, FrontendProduct>;
  environments: Record<string, FrontendEnvironment>;
};

/** Client hosts of the legacy apps that are not in the frontend config. */
const LEGACY_WEB_HOSTS: Record<string, string[]> = {
  memotron: ["web.memotron.app", "pre.memotron.app", "dev.memotron.app"],
  pointron: ["web.pointron.app", "pre.pointron.app", "dev.pointron.app"],
  nucleus: ["web.nucleus.to", "pre.nucleus.to", "dev.nucleus.to"]
};

/** Legacy API hosts that no product in the frontend config points at. */
const LEGACY_API_DEFAULT_HOSTS: Record<string, string> = {
  "api.pointron.app": "web.pointron.app",
  "api.pointron.xyz": "pre.pointron.app"
};

/** Environments in the order that decides an API host's default web host. */
const DEFAULT_HOST_ENV_ORDER = ["live", "pre", "dev"];

export type OAuthRedirectAllowlist = {
  /** Exact client hosts a token may be sent to. */
  hosts: ReadonlySet<string>;
  /** App URL schemes allowed for `<scheme>_schemeredirect.<host>`. */
  schemes: ReadonlySet<string>;
  /** Default web host for each legacy API host, used when `state` is not trusted. */
  defaultHostByApiHost: ReadonlyMap<string, string>;
};

export function buildOAuthRedirectAllowlist(
  config: FrontendConfig = frontendConfig as FrontendConfig
): OAuthRedirectAllowlist {
  const hosts = new Set<string>();
  const schemes = new Set<string>();
  const defaultHostByApiHost = new Map<string, string>();

  for (const [productId, product] of Object.entries(config.products)) {
    schemes.add(productId);
    for (const environment of Object.values(config.environments)) {
      hosts.add(webHost(environment, productId, product.domain));
    }
  }
  for (const [productId, legacyHosts] of Object.entries(LEGACY_WEB_HOSTS)) {
    schemes.add(productId);
    legacyHosts.forEach((host) => hosts.add(host));
  }

  for (const envName of DEFAULT_HOST_ENV_ORDER) {
    const environment = config.environments[envName];
    if (!environment) continue;
    for (const [productId, product] of Object.entries(config.products)) {
      const apiUrl =
        product.env?.[envName]?.VITE_API_URL ??
        environment.buildEnv?.VITE_API_URL;
      const apiHost = apiUrl ? hostOf(apiUrl) : undefined;
      if (apiHost && !defaultHostByApiHost.has(apiHost)) {
        defaultHostByApiHost.set(
          apiHost,
          webHost(environment, productId, product.domain)
        );
      }
    }
  }
  for (const [apiHost, host] of Object.entries(LEGACY_API_DEFAULT_HOSTS)) {
    if (!defaultHostByApiHost.has(apiHost)) {
      defaultHostByApiHost.set(apiHost, host);
    }
  }

  return { hosts, schemes, defaultHostByApiHost };
}

function webHost(
  environment: FrontendEnvironment,
  productId: string,
  domain: string
) {
  if (environment.hosts?.web) {
    return environment.hosts.web
      .replaceAll("{product}", productId)
      .replaceAll("{domain}", domain);
  }
  return `${environment.webSubdomain}.${domain}`;
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

export type OAuthRedirectTarget =
  | { trusted: true; url: string; isSchemeRedirect: boolean }
  | { trusted: false; url: string | undefined };

const SCHEME_REDIRECT = /^([a-z][a-z0-9-]*)_schemeredirect\.(.+)$/;
const LOCAL_REDIRECT_PREFIX = "localredirect.";

/**
 * Resolves where the OAuth callback may send the caller.
 * @param domainPart the part of `state` after the first `:`
 * @param apiHost the legacy API host that received the callback
 */
export function resolveOAuthRedirectTarget(
  domainPart: string | undefined,
  apiHost: string | undefined,
  allowlist: OAuthRedirectAllowlist = defaultAllowlist()
): OAuthRedirectTarget {
  if (domainPart) {
    if (domainPart.startsWith(LOCAL_REDIRECT_PREFIX)) {
      const host = domainPart.slice(LOCAL_REDIRECT_PREFIX.length);
      if (allowlist.hosts.has(host)) {
        return {
          trusted: true,
          url: "tauri://localhost/index.html",
          isSchemeRedirect: false
        };
      }
    } else {
      const scheme = SCHEME_REDIRECT.exec(domainPart);
      if (scheme) {
        if (allowlist.schemes.has(scheme[1]) && allowlist.hosts.has(scheme[2])) {
          return {
            trusted: true,
            url: `${scheme[1]}://oauthsignin`,
            isSchemeRedirect: true
          };
        }
      } else if (allowlist.hosts.has(domainPart)) {
        return {
          trusted: true,
          url: `https://${domainPart}/oauth`,
          isSchemeRedirect: false
        };
      }
    }
  }
  const defaultHost = apiHost
    ? allowlist.defaultHostByApiHost.get(apiHost)
    : undefined;
  return {
    trusted: false,
    url: defaultHost ? `https://${defaultHost}/oauth` : undefined
  };
}

let cachedAllowlist: OAuthRedirectAllowlist | undefined;

function defaultAllowlist() {
  cachedAllowlist ??= buildOAuthRedirectAllowlist();
  return cachedAllowlist;
}

export type OAuthSignInResult =
  | { token?: string; isSignup?: boolean; error?: unknown }
  | undefined;

export type OAuthSignIn = (
  body: any,
  provider: string,
  endpoint: string
) => Promise<OAuthSignInResult>;

const UNKNOWN_HOST_ERROR = "Unknown redirect host";

/**
 * Builds the callback response. Signs the caller in only when `state` names an
 * allowlisted client; otherwise redirects to the API's default host (or
 * answers 400) without signing in.
 */
export async function buildOAuthRedirectResponse(
  body: any,
  provider: string,
  endpoint: string,
  signIn: OAuthSignIn,
  allowlist: OAuthRedirectAllowlist = defaultAllowlist()
) {
  const domainPart = stateDomainPart(body?.state);
  const target = resolveOAuthRedirectTarget(domainPart, endpoint, allowlist);
  console.log({ provider, endpoint, trusted: target.trusted });

  if (!target.trusted) {
    if (!target.url) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/plain" },
        body: UNKNOWN_HOST_ERROR
      };
    }
    return redirect(
      `${target.url}/error?error=${encodeURIComponent(UNKNOWN_HOST_ERROR)}`
    );
  }

  try {
    const result = await signIn(body, provider, endpoint);
    if (result?.token) {
      let location = `${target.url}?token=${result.token}`;
      if (!target.isSchemeRedirect) {
        location += `&provider=${provider}&signup=${result.isSignup}`;
      }
      return redirect(location);
    }
    if (result?.error) {
      return redirect(`${target.url}/error?error=${result.error}`);
    }
    return redirect(target.url);
  } catch (e) {
    console.error(e);
    return redirect(`${target.url}/error?error=Something went wrong`);
  }
}

/** The domain part of a `<guest>:<domainPart>` state; anything else has none. */
function stateDomainPart(state: unknown) {
  if (typeof state !== "string") return undefined;
  const parts = state.split(":");
  return parts.length === 2 ? parts[1] : undefined;
}

function redirect(location: string) {
  return { statusCode: 302, headers: { Location: location }, body: "" };
}
