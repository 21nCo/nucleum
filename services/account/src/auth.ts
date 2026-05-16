import {
  authFnApiKeyPlugin,
  authFnEmailOtpPlugin,
  authFnMultiRegionPlugin,
  authFnNativeHandoffPlugin,
  authFnPasswordPlugin,
  authFnSocialOAuthPlugin,
  authFnTwoFactorPlugin,
  createAuthFn,
  type AuthFnEvent,
  type AuthFnConfig,
  type AuthFnDeliveryProvider,
  type AuthFnMultiRegionRegionConfig,
  type AuthFnRegionLookupStore,
  type AuthFnSocialProviderConfig,
  type SocialOAuthPluginConfig
} from '@authfn/core';
import type { Adapter, KVStoreAdapter } from '@superfunctions/db';
import type { Logger } from '@logfn/core';
import { createAccountLookupStore } from './lookup/dynamodb.js';
import { createAuthSecurityEmitter } from './security/events.js';
import { nucleusLifecyclePlugin } from './plugins/nucleus-lifecycle.js';
import { nucleusWidgetTokenPlugin } from './plugins/widget-token.js';
import { ACCOUNT_AUTH_NAMESPACE } from './db/schema.js';
import { sendAccountDebugLog } from './debug-sink.js';

export interface CreateAccountAuthInput {
  database: Adapter;
  cacheStore: KVStoreAdapter;
  delivery: AuthFnDeliveryProvider;
  logger: Logger;
  regions?: AuthFnMultiRegionRegionConfig[];
  lookupStore?: AuthFnRegionLookupStore;
  oauthProviders?: Partial<Record<'google' | 'apple', AuthFnSocialProviderConfig | undefined>>;
  oauthPlugin?: Omit<SocialOAuthPluginConfig, 'providers'>;
  securityEventSink?: (event: AuthFnEvent) => Promise<void> | void;
}

export function createAccountAuth(input: CreateAccountAuthInput) {
  const regions = input.regions ?? resolveRegions();
  const defaultRegion = regions[0];
  const oauthProviders = input.oauthProviders ?? resolveOAuthProviders();
  const config: AuthFnConfig = {
    database: input.database,
    cacheStore: input.cacheStore,
    namespace: process.env.AUTHFN_NAMESPACE ?? ACCOUNT_AUTH_NAMESPACE,
    basePath: '/auth',
    cookie: {
      prefix: process.env.AUTHFN_COOKIE_PREFIX ?? 'nucleus',
      sameSite: 'lax',
      secure: resolveCookieSecure(defaultRegion.authority)
    },
    accountLinking: {
      oauthByVerifiedEmail: {
        providers: ['google', 'apple'],
        requireExistingEmailVerified: true,
        requireProviderEmailVerified: true
      },
      otpSignUpExistingUser: true,
      passwordForAuthenticatedUser: {
        requireExistingEmailVerified: true
      }
    },
    runtime: {
      resolve(request) {
        const url = new URL(request.url);
        const matched = regions.find((region) =>
          [new URL(region.authority).hostname, ...(region.hosts ?? [])]
            .some((host) => host === url.hostname || url.hostname.endsWith(`.${host}`))
        ) ?? defaultRegion;

        return {
          issuer: matched.authority,
          baseUrl: matched.baseUrl ?? matched.authority,
          regionId: matched.regionId,
          cookie: matched.cookie,
          oauth: matched.oauth
        };
      }
    },
    observability: {
      emit: input.securityEventSink ?? createAuthSecurityEmitter(input.logger)
    },
    plugins: [
      authFnPasswordPlugin({
        otp: {
          delivery: input.delivery
        }
      }),
      authFnEmailOtpPlugin({
        delivery: input.delivery
      }),
      authFnSocialOAuthPlugin({
        ...input.oauthPlugin,
        fetcher: input.oauthPlugin?.fetcher ?? createOAuthDiagnosticFetcher(input.logger),
        providers: oauthProviders
      }),
      authFnTwoFactorPlugin({
        issuer: process.env.AUTHFN_2FA_ISSUER ?? 'Nucleus'
      }),
      authFnApiKeyPlugin(),
      authFnMultiRegionPlugin({
        regions,
        defaultRegionId: defaultRegion.regionId,
        lookupStore: input.lookupStore ?? createAccountLookupStore()
      }),
      authFnNativeHandoffPlugin(),
      nucleusLifecyclePlugin(),
      nucleusWidgetTokenPlugin()
    ],
    openApi: {
      title: 'Nucleus Account API',
      version: '2026-04-24'
    }
  };

  return createAuthFn(config);
}

function resolveCookieSecure(authority: string): boolean {
  const explicit = readBoolean(process.env.AUTHFN_COOKIE_SECURE);
  if (explicit !== undefined) {
    return explicit;
  }

  try {
    return new URL(authority).protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

function readBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function resolveRegions(): AuthFnMultiRegionRegionConfig[] {
  const raw = process.env.ACCOUNT_REGIONS_JSON;
  if (raw) {
    return JSON.parse(raw) as AuthFnMultiRegionRegionConfig[];
  }

  const authority = process.env.ACCOUNT_AUTHORITY ?? 'http://127.0.0.1:8787';
  const domain = process.env.ACCOUNT_COOKIE_DOMAIN;
  return [
    {
      regionId: process.env.ACCOUNT_REGION_ID ?? 'local',
      authority,
      hosts: [new URL(authority).hostname],
      domain,
      cookie: domain ? { domain } : undefined,
      oauth: {
        google: optionalOAuthProvider('GOOGLE'),
        apple: optionalOAuthProvider('APPLE')
      }
    }
  ];
}

function resolveOAuthProviders() {
  return {
    google: optionalOAuthProvider('GOOGLE'),
    apple: optionalOAuthProvider('APPLE')
  };
}

function optionalOAuthProvider(prefix: 'GOOGLE' | 'APPLE') {
  const clientId = process.env[`${prefix}_OAUTH_CLIENT_ID`];
  if (!clientId) {
    return undefined;
  }

  const configuredReturnTo = readCsv(process.env[`${prefix}_OAUTH_RETURN_TO`]);
  const providerReturnTo = withNativeOAuthReturnTargets(configuredReturnTo);
  const fallbackReturnTo = withNativeOAuthReturnTargets(readCsv(process.env.ACCOUNT_CORS_ORIGINS));
  const appleClientSecretResolver = prefix === 'APPLE'
    ? createAppleClientSecretResolver(clientId)
    : undefined;

  return {
    clientId,
    ...(appleClientSecretResolver
      ? { clientSecretResolver: appleClientSecretResolver }
      : { clientSecret: process.env[`${prefix}_OAUTH_CLIENT_SECRET`] }),
    allowlistedRedirectUris: readCsv(process.env[`${prefix}_OAUTH_REDIRECT_URIS`]),
    allowlistedReturnTo: configuredReturnTo.length > 0 ? providerReturnTo : fallbackReturnTo,
    ...(prefix === 'APPLE'
      ? { nativeClientIds: resolveAppleNativeClientIds() }
      : {}),
    scopes: prefix === 'GOOGLE' ? ['openid', 'email', 'profile'] : ['name', 'email']
  };
}

function resolveAppleNativeClientIds(): string[] {
  const configured = readCsv(process.env.APPLE_OAUTH_NATIVE_CLIENT_IDS);
  if (configured.length > 0) {
    return configured;
  }
  return ['io.nucleum', 'io.memotron', 'io.pointron'];
}

function withNativeOAuthReturnTargets(values: string[]): string[] {
  return Array.from(new Set([...values, ...nativeOAuthReturnTargets()]));
}

function nativeOAuthReturnTargets(): string[] {
  return ['nucleum', 'memotron', 'pointron'].map((scheme) => `${scheme}://oauthsignin`);
}

function readCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createOAuthDiagnosticFetcher(
  logger: Logger
): NonNullable<SocialOAuthPluginConfig['fetcher']> {
  return async (url, init) => {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body
    });
    const rawBody = await response.text();
    const provider = resolveOAuthTokenProvider(url);
    if (provider && (!response.ok || process.env.AUTHFN_OAUTH_DEBUG === 'true')) {
      const payload = {
        provider,
        request: summarizeOAuthTokenRequest(provider, init.body),
        response: summarizeOAuthTokenResponse(response.status, rawBody)
      };
      logger.info(`${provider} oauth token exchange`, {
        request: payload.request,
        response: payload.response
      });
      sendAccountDebugLog({
        level: response.ok ? 'info' : 'warn',
        message: `${provider} oauth token exchange`,
        payload,
        tags: ['authfn', 'oauth', provider, 'token-exchange']
      });
    }

    return {
      ok: response.ok,
      status: response.status,
      headers: {
        get(name: string) {
          return response.headers.get(name);
        }
      },
      async text() {
        return rawBody;
      }
    };
  };
}

function resolveOAuthTokenProvider(url: string): 'apple' | 'google' | undefined {
  if (url === 'https://appleid.apple.com/auth/token') {
    return 'apple';
  }
  if (url === 'https://oauth2.googleapis.com/token') {
    return 'google';
  }
  return undefined;
}

function summarizeOAuthTokenRequest(provider: 'apple' | 'google', body: string | undefined) {
  return provider === 'apple'
    ? summarizeAppleTokenRequest(body)
    : summarizeGoogleTokenRequest(body);
}

function summarizeGoogleTokenRequest(body: string | undefined) {
  const params = new URLSearchParams(body ?? '');
  return {
    grantType: params.get('grant_type'),
    clientId: params.get('client_id'),
    redirectUri: params.get('redirect_uri'),
    code: summarizeOAuthCode(params.get('code')),
    hasCodeVerifier: Boolean(params.get('code_verifier')),
    hasClientSecret: Boolean(params.get('client_secret'))
  };
}

function summarizeAppleTokenRequest(body: string | undefined) {
  const params = new URLSearchParams(body ?? '');
  const clientSecret = params.get('client_secret') ?? undefined;
  return {
    grantType: params.get('grant_type'),
    clientId: params.get('client_id'),
    redirectUri: params.get('redirect_uri'),
    code: summarizeOAuthCode(params.get('code')),
    hasCodeVerifier: Boolean(params.get('code_verifier')),
    clientSecret: summarizeJwt(clientSecret)
  };
}

function summarizeOAuthCode(value: string | null) {
  if (!value) {
    return { present: false };
  }

  return {
    present: true,
    length: value.length,
    hasWhitespace: /\s/.test(value),
    hasPlus: value.includes('+'),
    hasSlash: value.includes('/'),
    hasEquals: value.includes('='),
    startsWithExpectedPrefix: value.startsWith('c')
  };
}

function summarizeOAuthTokenResponse(status: number, rawBody: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    parsed = new URLSearchParams(rawBody);
  }

  if (parsed instanceof URLSearchParams) {
    return {
      status,
      error: parsed.get('error'),
      errorDescription: parsed.get('error_description')
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { status };
  }

  const record = parsed as Record<string, unknown>;
  return {
    status,
    error: typeof record.error === 'string' ? record.error : undefined,
    errorDescription:
      typeof record.error_description === 'string'
        ? record.error_description
        : undefined,
    hasIdToken: typeof record.id_token === 'string',
    hasAccessToken: typeof record.access_token === 'string'
  };
}

function summarizeJwt(value: string | undefined) {
  if (!value) {
    return { present: false };
  }

  const parts = value.split('.');
  if (parts.length !== 3) {
    return { present: true, validShape: false };
  }

  return {
    present: true,
    validShape: true,
    header: parseJwtPart(parts[0]),
    payload: summarizeJwtPayload(parseJwtPart(parts[1])),
    signatureBytes: decodeBase64Url(parts[2]).length
  };
}

function summarizeJwtPayload(value: Record<string, unknown> | undefined) {
  if (!value) {
    return undefined;
  }

  return {
    iss: value.iss,
    sub: value.sub,
    aud: value.aud,
    iat:
      typeof value.iat === 'number'
        ? new Date(value.iat * 1000).toISOString()
        : undefined,
    exp:
      typeof value.exp === 'number'
        ? new Date(value.exp * 1000).toISOString()
        : undefined
  };
}

function parseJwtPart(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function createAppleClientSecretResolver(
  clientId: string
): AuthFnSocialProviderConfig['clientSecretResolver'] | undefined {
  const staticJwt = readOptionalEnv('APPLE_OAUTH_CLIENT_SECRET_JWT')
    ?? readOptionalEnv('APPLE_JWT')
    ?? readJwtEnv('APPLE_OAUTH_CLIENT_SECRET');
  const privateKey = readOptionalEnv('APPLE_OAUTH_PRIVATE_KEY')
    ?? readOptionalEnv('APPLE_PRIVATE_KEY')
    ?? readPemEnv('APPLE_OAUTH_CLIENT_SECRET');
  const teamId = readOptionalEnv('APPLE_TEAM_ID') ?? readOptionalEnv('APPLE_OAUTH_TEAM_ID');
  const keyId = readOptionalEnv('APPLE_KEY_ID') ?? readOptionalEnv('APPLE_OAUTH_KEY_ID');

  if (staticJwt) {
    return () => ({
      clientSecret: staticJwt
    });
  }

  if (privateKey && teamId && keyId) {
    const signer = createAppleClientSecretSigner({
      clientId,
      keyId,
      privateKey,
      teamId
    });
    return async () => ({
      clientSecret: await signer()
    });
  }

  return undefined;
}

function createAppleClientSecretSigner(input: {
  clientId: string;
  keyId: string;
  privateKey: string;
  teamId: string;
}) {
  let cached: { clientSecret: string; expiresAtMs: number } | undefined;

  return async () => {
    const nowMs = Date.now();
    if (cached && cached.expiresAtMs - nowMs > 5 * 60 * 1000) {
      return cached.clientSecret;
    }

    const issuedAt = Math.floor(nowMs / 1000);
    const ttlSeconds = resolveAppleClientSecretTtlSeconds();
    const expiresAt = issuedAt + ttlSeconds;
    const header = {
      alg: 'ES256',
      kid: input.keyId,
      typ: 'JWT'
    };
    const payload = {
      iss: input.teamId,
      iat: issuedAt,
      exp: expiresAt,
      aud: 'https://appleid.apple.com',
      sub: input.clientId
    };
    const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
    const privateKey = await importApplePrivateKey(input.privateKey);
    const signature = await globalThis.crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      new TextEncoder().encode(signingInput)
    );
    const clientSecret = `${signingInput}.${base64UrlBytes(new Uint8Array(signature))}`;
    cached = {
      clientSecret,
      expiresAtMs: expiresAt * 1000
    };
    return clientSecret;
  };
}

function resolveAppleClientSecretTtlSeconds() {
  const parsed = Number(process.env.APPLE_CLIENT_SECRET_TTL_SECONDS);
  const maxAppleTtlSeconds = 180 * 24 * 60 * 60;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.floor(parsed), maxAppleTtlSeconds);
  }
  return 30 * 24 * 60 * 60;
}

async function importApplePrivateKey(privateKey: string) {
  return globalThis.crypto.subtle.importKey(
    'pkcs8',
    decodePem(privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

function decodePem(pem: string) {
  const normalized = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlJson(value: Record<string, unknown>) {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function readOptionalEnv(key: string) {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function readJwtEnv(key: string) {
  const value = readOptionalEnv(key);
  return value && value.split('.').length === 3 ? value : undefined;
}

function readPemEnv(key: string) {
  const value = readOptionalEnv(key);
  return value?.includes('BEGIN PRIVATE KEY') ? value : undefined;
}
