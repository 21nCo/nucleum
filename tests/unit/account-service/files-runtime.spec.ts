import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { memoryAdapter } from "@superfunctions/db/adapters/memory";
import {
  AuthFnCsrfInvalidError,
  AuthFnInvalidCredentialsError,
  AuthFnPlacementDirectoryUnavailableError,
  AuthFnRegionMismatchError,
  AuthFnRoutingCellUnavailableError,
  AuthFnSessionExpiredError,
  AuthFnSessionRevokedError,
  AuthFnUnauthenticatedError
} from "authfn";
import {
  closeAfterDeferredWork,
  createFileDeferredWork
} from "../../../services/account/src/files/deferred";
import {
  redactFileRequestPath,
  registerAccountFileRoutes
} from "../../../services/account/src/files/routes";
import {
  createAccountFileFn,
  createAccountFileSessionResolver,
  type AccountFileAuth
} from "../../../services/account/src/files/server";
import { createAccountFileStorage } from "../../../services/account/src/files/storage";

function deferredPromise() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("account FileFn deferred work", () => {
  it("closes request resources only after deferred work, including work it defers, settles", async () => {
    const waitUntil: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => void waitUntil.push(promise) };
    const deferred = createFileDeferredWork(ctx);
    const first = deferredPromise();
    const second = deferredPromise();
    deferred.runtime.defer!(first.promise);
    const close = vi.fn(async () => undefined);

    await closeAfterDeferredWork({ ctx, deferred, close, onError: vi.fn() });
    expect(close).not.toHaveBeenCalled();
    expect(waitUntil).toHaveLength(2);

    deferred.runtime.defer!(second.promise);
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(close).not.toHaveBeenCalled();

    second.reject(new Error("background failure"));
    await Promise.all(waitUntil);
    expect(close).toHaveBeenCalledTimes(1);
    expect(deferred.pending()).toBe(0);
  });

  it("closes before returning when no deferred work is pending", async () => {
    const ctx = { waitUntil: vi.fn() };
    const deferred = createFileDeferredWork(ctx);
    const close = vi.fn(async () => undefined);
    await closeAfterDeferredWork({ ctx, deferred, close, onError: vi.fn() });
    expect(close).toHaveBeenCalledTimes(1);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  it("reports a failed deferred close instead of rejecting waitUntil", async () => {
    const waitUntil: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => void waitUntil.push(promise) };
    const deferred = createFileDeferredWork(ctx);
    deferred.runtime.defer!(Promise.resolve());
    const failure = new Error("close failed");
    const onError = vi.fn();
    await closeAfterDeferredWork({
      ctx,
      deferred,
      close: async () => {
        throw failure;
      },
      onError
    });
    await expect(Promise.all(waitUntil)).resolves.toBeDefined();
    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe("account FileFn session resolver", () => {
  function authThrowing(error: unknown): AccountFileAuth {
    return {
      provider: { authenticate: vi.fn(async () => Promise.reject(error)) },
      authorizeMutation: vi.fn(async () => Promise.reject(error))
    } as unknown as AccountFileAuth;
  }
  function resolverThrowing(error: unknown) {
    return createAccountFileSessionResolver(authThrowing(error));
  }
  function filesAppThrowing(error: unknown): Hono {
    const app = new Hono();
    const storage = createAccountFileStorage(
      {
        FILEFN_R2_ACCOUNT_ID: "test-account",
        FILEFN_R2_ACCESS_KEY_ID: "test-access-key",
        FILEFN_R2_SECRET_ACCESS_KEY: "test-secret-key",
        FILEFN_R2_BUCKET: "nucleus-files-test-{region}"
      },
      "insouth",
      { endpoint: "https://r2.test", fetch: vi.fn() }
    );
    const fileFn = createAccountFileFn({
      auth: authThrowing(error),
      database: memoryAdapter({ debug: false }),
      storage: storage!
    });
    registerAccountFileRoutes({ app, getFileFn: async () => fileFn });
    return app;
  }
  const get = () => new Request("http://account.test/files");

  it("maps session-absence AuthFn errors to no principal (401)", async () => {
    for (const error of [
      new AuthFnUnauthenticatedError(),
      new AuthFnSessionExpiredError(),
      new AuthFnSessionRevokedError(),
      new AuthFnInvalidCredentialsError()
    ]) {
      await expect(resolverThrowing(error)(get()), error.code).resolves.toBeNull();
    }
  });

  it("lets region mismatch and AuthFn infrastructure failures propagate instead of answering 401", async () => {
    for (const error of [
      new AuthFnRegionMismatchError(undefined, { authority: "https://account-euwest.test" }),
      new AuthFnPlacementDirectoryUnavailableError(),
      new AuthFnRoutingCellUnavailableError()
    ]) {
      await expect(resolverThrowing(error)(get()), error.code).rejects.toBe(error);
    }
  });

  it("answers /files with the AuthFn status, code and details of a propagated AuthFn error", async () => {
    const mismatch = await filesAppThrowing(
      new AuthFnRegionMismatchError(undefined, {
        authority: "https://account-euwest.test",
        redirectTo: "https://account-euwest.test/files"
      })
    ).request("http://account.test/files");
    expect(mismatch.status).toBe(409);
    expect(mismatch.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await mismatch.json();
    expect(body.error).toMatchObject({
      code: "AUTHFN_REGION_MISMATCH",
      details: {
        authority: "https://account-euwest.test",
        redirectTo: "https://account-euwest.test/files"
      }
    });

    const unavailable = await filesAppThrowing(
      new AuthFnPlacementDirectoryUnavailableError()
    ).request("http://account.test/files");
    expect(unavailable.status).toBe(503);
    expect((await unavailable.json()).error).toMatchObject({
      code: "AUTHFN_PLACEMENT_DIRECTORY_UNAVAILABLE",
      retryable: true
    });

    const signedOut = await filesAppThrowing(new AuthFnSessionExpiredError()).request(
      "http://account.test/files"
    );
    expect(signedOut.status).toBe(401);
    expect((await signedOut.json()).error.code).toBe("FILEFN_AUTH_REQUIRED");
  });

  it("maps a CSRF failure on a write to 403", async () => {
    const resolve = resolverThrowing(new AuthFnCsrfInvalidError());
    await expect(
      resolve(new Request("http://account.test/files/upload/init", { method: "POST" }))
    ).rejects.toMatchObject({ code: "FILEFN_FORBIDDEN" });
  });
});

describe("account FileFn request path redaction", () => {
  it("replaces share tokens with :token on share download and revoke paths", () => {
    expect(redactFileRequestPath("/files/share-links/secret-token/download")).toBe(
      "/files/share-links/:token/download"
    );
    expect(redactFileRequestPath("/files/proxy/share-links/secret-token/download")).toBe(
      "/files/proxy/share-links/:token/download"
    );
    expect(redactFileRequestPath("/files/file-1/share-links/secret-token")).toBe(
      "/files/file-1/share-links/:token"
    );
    expect(redactFileRequestPath("/files/proxy/share%2Dlinks/secret-token/download/")).toBe(
      "/files/proxy/share%2Dlinks/:token/download/"
    );
  });

  it("leaves other paths unchanged", () => {
    for (const path of [
      "/files/file-1/share-links",
      "/files/file-1/download",
      "/datafn/share-links/not-a-file-token",
      "/auth/session"
    ]) {
      expect(redactFileRequestPath(path)).toBe(path);
    }
  });
});
