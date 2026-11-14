import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { memoryAdapter } from "@superfunctions/db/adapters/memory";
import {
  AuthFnApiKeyRevokedError,
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
  isolateFileResponse,
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

  it("reports each failed deferred task once and still closes resources once", async () => {
    const waitUntil: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => void waitUntil.push(promise) };
    const onWorkError = vi.fn();
    const deferred = createFileDeferredWork(ctx, onWorkError);
    const outer = deferredPromise();
    const nested = deferredPromise();
    const outerFailure = new Error("upload finalize failed");
    const nestedFailure = new Error("cleanup failed");
    deferred.runtime.defer!(outer.promise);
    deferred.runtime.defer!(Promise.resolve());
    const close = vi.fn(async () => undefined);

    await closeAfterDeferredWork({ ctx, deferred, close, onError: vi.fn() });
    deferred.runtime.defer!(nested.promise);
    outer.reject(outerFailure);
    await Promise.resolve();
    await Promise.resolve();
    expect(close).not.toHaveBeenCalled();
    nested.reject(nestedFailure);
    await Promise.all(waitUntil);

    expect(onWorkError).toHaveBeenCalledTimes(2);
    expect(onWorkError).toHaveBeenNthCalledWith(1, outerFailure);
    expect(onWorkError).toHaveBeenNthCalledWith(2, nestedFailure);
    expect(close).toHaveBeenCalledTimes(1);
    expect(deferred.pending()).toBe(0);
  });

  it("settles a failed task even when the error hook throws", async () => {
    const deferred = createFileDeferredWork(undefined, () => {
      throw new Error("logger down");
    });
    deferred.runtime.defer!(Promise.reject(new Error("work failed")));
    await expect(deferred.settled()).resolves.toBeUndefined();
    expect(deferred.pending()).toBe(0);
  });
});

describe("account FileFn response isolation", () => {
  const isolationHeaders = (response: Response) => [
    response.headers.get("x-content-type-options"),
    response.headers.get("content-security-policy")
  ];

  it("keeps quoted disposition parameters verbatim when forcing an attachment", () => {
    const response = isolateFileResponse(
      new Request("http://account.test/files/proxy/files/file-1/download"),
      new Response("bytes", {
        headers: {
          "content-type": "text/plain",
          "content-disposition": 'inline; filename="a;b.txt"; filename*=UTF-8\'\'a%3Bb.txt'
        }
      })
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="a;b.txt"; filename*=UTF-8\'\'a%3Bb.txt'
    );
  });

  it("sends successful proxy bytes as attachments but leaves proxy errors as API responses", async () => {
    const proxy = new Request("http://account.test/files/proxy/files/file-1/download");
    const ok = isolateFileResponse(
      proxy,
      new Response("bytes", { status: 200, headers: { "content-type": "image/svg+xml" } })
    );
    expect(ok.headers.get("content-disposition")).toBe("attachment");
    expect(isolationHeaders(ok)).toEqual(["nosniff", "sandbox; default-src 'none'"]);

    for (const status of [400, 403, 404, 409, 500, 503]) {
      const error = isolateFileResponse(
        proxy,
        Response.json({ ok: false, error: { code: "FILEFN_ERROR" } }, { status })
      );
      expect(error.status, String(status)).toBe(status);
      expect(error.headers.get("content-disposition"), String(status)).toBeNull();
      expect(isolationHeaders(error), String(status)).toEqual([
        "nosniff",
        "sandbox; default-src 'none'"
      ]);
      expect((await error.json()).error.code).toBe("FILEFN_ERROR");
    }
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
      new AuthFnInvalidCredentialsError(),
      new AuthFnApiKeyRevokedError()
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
  });

  it("redacts the token whatever the mount encoding, separators, casing or escapes", () => {
    const cases: Array<[string, string]> = [
      ["/%66iles/share-links/secret-token/download", "/files/share-links/:token/download"],
      ["/files/share-links//secret-token/download", "/files/share-links//:token/download"],
      ["/files//share-links/secret-token/download", "/files//share-links/:token/download"],
      ["//files/share-links/secret-token/download", "//files/share-links/:token/download"],
      ["/files/%73hare-links/secret-token", "/files/share-links/:token"],
      ["/files/proxy/share%2Dlinks/secret-token/download/", "/files/proxy/share-links/:token/download/"],
      ["/files/proxy/share-links%2Fsecret-token/download", "/files/proxy/share-links/:token/download"],
      ["/files/proxy/share-links%252Fsecret-token/download", "/files/proxy/share-links/:token/download"],
      ["/files/SHARE-LINKS/secret-token/download", "/files/SHARE-LINKS/:token/download"],
      ["/files/share-links/secret-token/extra/secret-token", "/files/share-links/:token/:token/:token"],
      ["/files/share-links/secret-token%zz/download", "/files/share-links/:token/download"],
      ["/files/share-links/secret%2Ftoken/download", "/files/share-links/:token/:token/download"]
    ];
    for (const [input, expected] of cases) {
      const redacted = redactFileRequestPath(input);
      expect(redacted, input).toBe(expected);
      expect(redacted, input).not.toContain("secret");
    }
  });

  it("leaves other paths unchanged", () => {
    for (const path of [
      "/files/file-1/share-links",
      "/files/file-1/download",
      "/files/sharelinks/file-1",
      "/files/%zz/download",
      "/auth/session"
    ]) {
      expect(redactFileRequestPath(path)).toBe(path);
    }
  });
});
