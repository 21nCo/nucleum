import {
  authfn,
  type AuthFnConfig,
  type AuthFnDeliveryMessageResolver,
  type AuthFnDeliveryProvider,
  type AuthFnEvent,
  type AuthFnRateLimitConfig,
  type AuthFnServer
} from "authfn";
import {
  authFnMultiRegionEnvironment,
  type AuthFnMultiRegionRegionConfig
} from "@authfn/multi-region";
import {
  createAppleClientSecretResolver,
  type AuthFnSocialProviderConfig,
  type OAuthTokenExchangeDiagnostic,
  type SocialOAuthPluginRuntimeConfig
} from "@authfn/social-oauth";
import type { Adapter, ConditionalKVStoreAdapter, RuntimeStores } from "@superfunctions/db";
import type { SuperfunctionObservability } from "@superfunctions/observability";
import { createAccountLookupStore } from "./lookup/dynamodb.js";
import { ACCOUNT_AUTH_NAMESPACE } from "./auth/constants.js";
import { sendAccountDebugLog } from "./debug-sink.js";
import { createAccountAuthPlugins } from "./auth/plugins.js";

export interface CreateAccountAuthInput {
  database: Adapter;
  stores: RuntimeStores;
  delivery: AuthFnDeliveryProvider;
  deliveryMessage?: AuthFnDeliveryMessageResolver;
  regions?: AuthFnMultiRegionRegionConfig[];
  regionLookupStore?: ConditionalKVStoreAdapter;
  oauthProviders?: Partial<
    Record<"google" | "apple", AuthFnSocialProviderConfig | undefined>
  >;
  oauthPlugin?: Omit<SocialOAuthPluginRuntimeConfig, "providers">;
  rateLimit?: AuthFnRateLimitConfig;
  observability?: SuperfunctionObservability<AuthFnEvent>;
}

/**
 * Creates the account-service AuthFn app definition for codegen and runtime use.
 */
export function accountAuthfn(
  regions: AuthFnMultiRegionRegionConfig[] = resolveRegions()
) {
  const defaultRegion = regions[0];
  const config = {
    namespace: process.env.AUTHFN_NAMESPACE ?? ACCOUNT_AUTH_NAMESPACE,
    basePath: "/auth",
    cookie: {
      prefix: process.env.AUTHFN_COOKIE_PREFIX ?? "nucleus",
      sameSite: "lax",
      secure: resolveCookieSecure(defaultRegion.authority)
    },
    accountLinking: {
      oauthByVerifiedEmail: {
        providers: ["google", "apple"],
        requireExistingEmailVerified: true,
        requireProviderEmailVerified: true
      },
      otpSignUpExistingUser: true,
      passwordForAuthenticatedUser: {
        requireExistingEmailVerified: true
      }
    },
    plugins: createAccountAuthPlugins(),
    openApi: {
      title: "Nucleus Account API",
      version: "2026-04-24"
    }
  } satisfies AuthFnConfig<ReturnType<typeof createAccountAuthPlugins>>;

  return authfn(config);
}

export type AccountAuthApp = ReturnType<typeof accountAuthfn>;

export function createAccountAuth(input: CreateAccountAuthInput): AuthFnServer {
  const regions = input.regions ?? resolveRegions();
  const defaultRegion = regions[0];
  const oauthProviders = input.oauthProviders ?? resolveOAuthProviders();
  const multiRegion = {
    regions,
    defaultRegionId: defaultRegion.regionId,
    lookupStore: input.regionLookupStore ?? createAccountLookupStore(),
    observability: input.observability
  };
  return accountAuthfn(regions).createServer({
    database: input.database,
    stores: input.stores,
    rateLimit:
      input.rateLimit ??
      {
        enabled: true,
        mode: input.stores.atomicKv ? "strict" : "best-effort"
      },
    environment: authFnMultiRegionEnvironment(multiRegion),
    observability: input.observability,
    pluginRuntime: {
      password: {
        otp: {
          delivery: input.delivery,
          message: input.deliveryMessage
        }
      },
      emailOtp: {
        delivery: input.delivery,
        message: input.deliveryMessage
      },
      socialOAuth: {
        ...input.oauthPlugin,
        diagnostics:
          input.oauthPlugin?.diagnostics ?? createAccountOAuthDiagnostics(),
        providers: oauthProviders
      },
      twoFactor: {
        issuer: process.env.AUTHFN_2FA_ISSUER ?? "Nucleus"
      }
    }
  });
}

function resolveCookieSecure(authority: string): boolean {
  const explicit = readBoolean(process.env.AUTHFN_COOKIE_SECURE);
  if (explicit !== undefined) {
    return explicit;
  }

  try {
    return new URL(authority).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

function readBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function resolveRegions(): AuthFnMultiRegionRegionConfig[] {
  const raw = process.env.ACCOUNT_REGIONS_JSON;
  if (raw) {
    return JSON.parse(raw) as AuthFnMultiRegionRegionConfig[];
  }

  const authority = process.env.ACCOUNT_AUTHORITY ?? "http://127.0.0.1:8787";
  const domain = process.env.ACCOUNT_COOKIE_DOMAIN;
  return [
    {
      regionId: process.env.ACCOUNT_REGION_ID ?? "local",
      authority,
      hosts: [new URL(authority).hostname],
      domain,
      cookie: domain ? { domain } : undefined,
      oauth: {
        google: optionalOAuthProvider("GOOGLE"),
        apple: optionalOAuthProvider("APPLE")
      }
    }
  ];
}

function resolveOAuthProviders() {
  return {
    google: optionalOAuthProvider("GOOGLE"),
    apple: optionalOAuthProvider("APPLE")
  };
}

function optionalOAuthProvider(prefix: "GOOGLE" | "APPLE") {
  const clientId = process.env[`${prefix}_OAUTH_CLIENT_ID`];
  if (!clientId) {
    return undefined;
  }

  const configuredReturnTo = readCsv(process.env[`${prefix}_OAUTH_RETURN_TO`]);
  const providerReturnTo = withNativeOAuthReturnTargets(configuredReturnTo);
  const fallbackReturnTo = withNativeOAuthReturnTargets(
    readCsv(process.env.ACCOUNT_CORS_ORIGINS)
  );
  const appleClientSecretResolver =
    prefix === "APPLE" ? resolveAppleClientSecretResolver(clientId) : undefined;

  return {
    clientId,
    ...(appleClientSecretResolver
      ? { clientSecretResolver: appleClientSecretResolver }
      : { clientSecret: process.env[`${prefix}_OAUTH_CLIENT_SECRET`] }),
    allowlistedRedirectUris: readCsv(
      process.env[`${prefix}_OAUTH_REDIRECT_URIS`]
    ),
    allowlistedReturnTo:
      configuredReturnTo.length > 0 ? providerReturnTo : fallbackReturnTo,
    ...(prefix === "APPLE"
      ? { nativeClientIds: resolveAppleNativeClientIds() }
      : {}),
    scopes:
      prefix === "GOOGLE" ? ["openid", "email", "profile"] : ["name", "email"]
  };
}

function resolveAppleNativeClientIds(): string[] {
  const configured = readCsv(process.env.APPLE_OAUTH_NATIVE_CLIENT_IDS);
  if (configured.length > 0) {
    return configured;
  }
  return ["io.nucleum", "io.memotron", "io.pointron"];
}

function withNativeOAuthReturnTargets(values: string[]): string[] {
  return Array.from(new Set([...values, ...nativeOAuthReturnTargets()]));
}

function nativeOAuthReturnTargets(): string[] {
  return ["nucleum", "memotron", "pointron"].map(
    (scheme) => `${scheme}://oauthsignin`
  );
}

function readCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createAccountOAuthDiagnostics(): NonNullable<
  SocialOAuthPluginRuntimeConfig["diagnostics"]
> {
  return {
    tokenExchange: {
      includeSuccessful: process.env.AUTHFN_OAUTH_DEBUG === "true",
      sink: (diagnostic: OAuthTokenExchangeDiagnostic) => {
        sendAccountDebugLog({
          level: diagnostic.ok ? "info" : "warn",
          message: `${diagnostic.provider} oauth token exchange`,
          payload: diagnostic,
          tags: ["authfn", "oauth", diagnostic.provider, "token-exchange"]
        });
      }
    }
  };
}

function resolveAppleClientSecretResolver(
  clientId: string
): AuthFnSocialProviderConfig["clientSecretResolver"] | undefined {
  const staticJwt =
    readOptionalEnv("APPLE_OAUTH_CLIENT_SECRET_JWT") ??
    readOptionalEnv("APPLE_JWT") ??
    readJwtEnv("APPLE_OAUTH_CLIENT_SECRET");
  const privateKey =
    readOptionalEnv("APPLE_OAUTH_PRIVATE_KEY") ??
    readOptionalEnv("APPLE_PRIVATE_KEY") ??
    readPemEnv("APPLE_OAUTH_CLIENT_SECRET");
  const teamId =
    readOptionalEnv("APPLE_TEAM_ID") ?? readOptionalEnv("APPLE_OAUTH_TEAM_ID");
  const keyId =
    readOptionalEnv("APPLE_KEY_ID") ?? readOptionalEnv("APPLE_OAUTH_KEY_ID");

  return createAppleClientSecretResolver({
    clientId,
    staticJwt,
    privateKey,
    teamId,
    keyId,
    ttlSeconds: resolveAppleClientSecretTtlSeconds()
  });
}

function resolveAppleClientSecretTtlSeconds() {
  const parsed = Number(process.env.APPLE_CLIENT_SECRET_TTL_SECONDS);
  const maxAppleTtlSeconds = 180 * 24 * 60 * 60;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.floor(parsed), maxAppleTtlSeconds);
  }
  return 30 * 24 * 60 * 60;
}

function readOptionalEnv(key: string) {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function readJwtEnv(key: string) {
  const value = readOptionalEnv(key);
  return value && value.split(".").length === 3 ? value : undefined;
}

function readPemEnv(key: string) {
  const value = readOptionalEnv(key);
  return value?.includes("BEGIN PRIVATE KEY") ? value : undefined;
}
