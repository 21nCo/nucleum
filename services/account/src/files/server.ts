import {
  createFileFn,
  createNucleusPolicies,
  forbidden,
  type FileFn,
  type FileFnPrincipal,
  type FileFnRuntime
} from "@filefn/server";
import type { Adapter, RuntimeStores } from "@superfunctions/db";
import type { StorageAdapter } from "@superfunctions/storage";
import {
  AuthFnApiKeyRevokedError,
  AuthFnCsrfInvalidError,
  AuthFnInvalidCredentialsError,
  AuthFnSessionExpiredError,
  AuthFnSessionRevokedError,
  AuthFnUnauthenticatedError,
  type AuthFnServer
} from "authfn";

/** Path prefix the account service mounts FileFn under. */
export const ACCOUNT_FILES_BASE_PATH = "/files";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** AuthFn errors that mean the request carries no usable session. */
const SESSION_ABSENT_ERRORS = [
  AuthFnUnauthenticatedError,
  AuthFnSessionExpiredError,
  AuthFnSessionRevokedError,
  AuthFnInvalidCredentialsError,
  AuthFnApiKeyRevokedError
] as const;

/** AuthFn operations FileFn needs to resolve the request principal. */
export type AccountFileAuth = Pick<AuthFnServer, "provider" | "authorizeMutation">;

/** Dependencies for the account-service FileFn instance. */
export interface CreateAccountFileFnInput {
  /** AuthFn server whose sessions identify the FileFn principal. */
  auth: AccountFileAuth;
  /** Regional Postgres adapter holding the FileFn tables. */
  database: Adapter;
  /** The region's R2 storage adapter. */
  storage: StorageAdapter;
  /** Shared runtime stores passed through to FileFn. */
  stores?: RuntimeStores;
  /** Host hooks, such as the Worker `defer` that extends the request. */
  runtime?: FileFnRuntime;
}

/**
 * Creates the account-service FileFn instance: AuthFn sessions resolve the
 * principal, Nucleus policies cap uploads at 100 MB and the allowed types,
 * and the router serves under `/files`.
 */
export function createAccountFileFn(input: CreateAccountFileFnInput): FileFn {
  return createFileFn({
    database: input.database,
    storage: input.storage,
    stores: input.stores,
    policies: createNucleusPolicies(),
    auth: {
      required: true,
      resolveSession: createAccountFileSessionResolver(input.auth)
    },
    basePath: ACCOUNT_FILES_BASE_PATH,
    runtime: input.runtime
  });
}

/**
 * Maps the AuthFn session on a request to the FileFn principal, using the
 * session `actorId` as `principalId`. Unsafe methods go through
 * `authorizeMutation`, so a cookie session must carry its CSRF token. A
 * missing, expired, revoked or forged session resolves to null (401) and a
 * CSRF failure to 403. Every other error propagates: the `/files` routes
 * answer an AuthFn error, such as a region mismatch (409 with its redirect
 * details) or an unavailable placement directory (503), with its own status
 * and code, so neither is reported as a signed-out user.
 */
export function createAccountFileSessionResolver(
  auth: AccountFileAuth
): (request: Request) => Promise<FileFnPrincipal | null> {
  return async (request) => {
    try {
      const session = SAFE_METHODS.has(request.method.toUpperCase())
        ? await auth.provider.authenticate(request)
        : await auth.authorizeMutation(request);
      return session?.actorId ? { principalId: session.actorId } : null;
    } catch (error) {
      if (error instanceof AuthFnCsrfInvalidError) {
        throw forbidden({ reason: "csrf" });
      }
      if (SESSION_ABSENT_ERRORS.some((type) => error instanceof type)) {
        return null;
      }
      throw error;
    }
  };
}
