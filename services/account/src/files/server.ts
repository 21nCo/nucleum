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
  AuthFnCsrfInvalidError,
  AuthFnError,
  type AuthFnServer
} from "authfn";

/** Path prefix the account service mounts FileFn under. */
export const ACCOUNT_FILES_BASE_PATH = "/files";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** AuthFn operations FileFn needs to resolve the request principal. */
export type AccountFileAuth = Pick<AuthFnServer, "provider" | "authorizeMutation">;

export interface CreateAccountFileFnInput {
  auth: AccountFileAuth;
  database: Adapter;
  storage: StorageAdapter;
  stores?: RuntimeStores;
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
 * missing, expired, revoked or forged session (any other AuthFn 4xx) resolves
 * to null (401) and a CSRF failure to 403. AuthFn 5xx failures, such as an
 * unavailable placement directory or routing cell, and non-AuthFn errors
 * propagate so an outage is not reported as a signed-out user.
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
      if (error instanceof AuthFnError && error.status < 500) {
        return null;
      }
      throw error;
    }
  };
}
