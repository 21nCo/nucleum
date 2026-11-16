import type { AuthFnApiKeyRecord } from "@authfn/client";
import {
  interfaceApps,
  interfaceContract,
  type InterfaceApp
} from "@nucleum/schema/interfaces";
import {
  authClient,
  shouldUseAuthFnBearerSession
} from "@nucleum/client/runtime/account/auth";

/** Access a personal access token grants to its app. */
export type AccessTokenAccess = "read" | "read-write";

/** Lifetimes a new personal access token may be created with, in days. */
export const accessTokenExpiryDays = [7, 30, 90, 365] as const;

/** One lifetime a new personal access token may be created with, in days. */
export type AccessTokenExpiryDays = (typeof accessTokenExpiryDays)[number];

/** Longest token name the account service stores, in UTF-8 bytes. */
export const ACCESS_TOKEN_NAME_MAX_BYTES = 128;

/** A personal access token as listed in Account settings. */
export interface AccessToken {
  id: string;
  name: string;
  app: InterfaceApp | null;
  access: AccessTokenAccess | null;
  scopes: string[];
  createdAt: Date | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

/** Input for creating a personal access token. */
export interface CreateAccessTokenInput {
  name: string;
  app: InterfaceApp;
  access: AccessTokenAccess;
  expiresInDays: AccessTokenExpiryDays;
}

/** A created token; `secret` is returned by the account service only once. */
export interface CreatedAccessToken {
  id: string;
  secret: string;
}

/**
 * Why a token request failed: `session` when the account service needs a
 * signed-in web session, `unsupported` when this client holds a bearer
 * session the token routes do not accept, `invalid` for rejected input, and
 * `failed` otherwise.
 */
export type AccessTokenErrorKind =
  | "session"
  | "unsupported"
  | "invalid"
  | "failed";

/** Result of one personal access token request. */
export type AccessTokenResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: AccessTokenErrorKind; message: string };

const SESSION_ERROR_CODES = new Set([
  "AUTHFN_UNAUTHENTICATED",
  "AUTHFN_SESSION_EXPIRED",
  "AUTHFN_SESSION_REVOKED",
  "AUTHFN_CSRF_INVALID"
]);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the scopes a token for `app` carries: `<app>:read`, plus
 * `<app>:write` for read-write access.
 */
export function resolveAccessTokenScopes(
  app: InterfaceApp,
  access: AccessTokenAccess
): string[] {
  const { read, write } = interfaceContract[app].scopes;
  return access === "read-write" ? [read, write] : [read];
}

/**
 * Describes stored scopes as one app and its access, or nulls when they are
 * not exactly the scopes this section creates (for example `*`, several apps,
 * or write without read).
 */
export function describeAccessTokenScopes(scopes: readonly string[]): {
  app: InterfaceApp | null;
  access: AccessTokenAccess | null;
} {
  const unique = Array.from(new Set(scopes));
  for (const app of interfaceApps) {
    for (const access of ["read", "read-write"] as const) {
      const expected = resolveAccessTokenScopes(app, access);
      if (
        unique.length === expected.length &&
        expected.every((scope) => unique.includes(scope))
      ) {
        return { app, access };
      }
    }
  }
  return { app: null, access: null };
}

/** True when the token's expiry is at or before `now`. */
export function isAccessTokenExpired(token: AccessToken, now = new Date()) {
  return token.expiresAt !== null && token.expiresAt.getTime() <= now.getTime();
}

/**
 * Lists the signed-in user's personal access tokens, newest first. Revoked
 * tokens are left out.
 */
export async function listAccessTokens(): Promise<
  AccessTokenResult<AccessToken[]>
> {
  return request(async (client) => {
    const response = await client.listApiKeys();
    if (!response.ok) return failure(response.error);
    const tokens = response.data.keys
      .filter((key) => !key.revokedAt)
      .map(toAccessToken)
      .sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      );
    return { ok: true, data: tokens };
  });
}

/**
 * Creates a personal access token for one app. The returned secret cannot be
 * read again after this call.
 */
export async function createAccessToken(
  input: CreateAccessTokenInput,
  now = new Date()
): Promise<AccessTokenResult<CreatedAccessToken>> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, kind: "invalid", message: "Enter a token name." };
  }
  if (new TextEncoder().encode(name).length > ACCESS_TOKEN_NAME_MAX_BYTES) {
    return {
      ok: false,
      kind: "invalid",
      message: "Token name is too long."
    };
  }
  if (!interfaceApps.includes(input.app)) {
    return { ok: false, kind: "invalid", message: "Choose an app." };
  }
  if (!accessTokenExpiryDays.includes(input.expiresInDays)) {
    return { ok: false, kind: "invalid", message: "Choose an expiry." };
  }
  return request(async (client) => {
    const response = await client.createApiKey({
      name,
      scopes: resolveAccessTokenScopes(input.app, input.access),
      expiresAt: new Date(
        now.getTime() + input.expiresInDays * DAY_MS
      ).toISOString()
    });
    if (!response.ok) return failure(response.error);
    return {
      ok: true,
      data: { id: response.data.keyId, secret: response.data.secret }
    };
  });
}

/** Revokes one of the signed-in user's personal access tokens. */
export async function revokeAccessToken(
  id: string
): Promise<AccessTokenResult<{ id: string }>> {
  return request(async (client) => {
    const response = await client.revokeApiKey({ keyId: id });
    if (!response.ok) return failure(response.error);
    return { ok: true, data: { id } };
  });
}

async function request<T>(
  run: (
    client: Awaited<ReturnType<typeof authClient>>
  ) => Promise<AccessTokenResult<T>>
): Promise<AccessTokenResult<T>> {
  if (shouldUseAuthFnBearerSession()) {
    return {
      ok: false,
      kind: "unsupported",
      message: "Manage access tokens from the web app."
    };
  }
  try {
    return await run(await authClient());
  } catch {
    return {
      ok: false,
      kind: "failed",
      message: "Could not reach the account service. Try again."
    };
  }
}

function failure(error: { code: string; message: string }): {
  ok: false;
  kind: AccessTokenErrorKind;
  message: string;
} {
  if (SESSION_ERROR_CODES.has(error.code)) {
    return {
      ok: false,
      kind: "session",
      message: "Sign in again to manage access tokens."
    };
  }
  if (error.code === "AUTHFN_VALIDATION_ERROR") {
    return { ok: false, kind: "invalid", message: error.message };
  }
  return {
    ok: false,
    kind: "failed",
    message: error.message || "Something went wrong. Try again."
  };
}

function toAccessToken(key: AuthFnApiKeyRecord): AccessToken {
  const scopes = Array.isArray(key.scopes)
    ? key.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];
  return {
    id: key.id,
    name: key.name?.trim() || key.id,
    ...describeAccessTokenScopes(scopes),
    scopes,
    createdAt: toDate(key.createdAt),
    expiresAt: toDate(key.expiresAt),
    lastUsedAt: toDate(key.lastUsedAt)
  };
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
