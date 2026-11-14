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
  FILE_RESPONSE_ISOLATION_HEADERS,
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

  it("answers a FileFn initialization or handler failure with an isolated 500", async () => {
    const onError = vi.fn((_error: Error) => new Response("Internal Server Error", { status: 500 }));
    const failingApps = [
      async () => {
        throw new Error("database pool down");
      },
      async () =>
        ({
          router: {
            handle: async () => {
              throw new Error("router crashed");
            }
          }
        }) as never
    ];
    for (const getFileFn of failingApps) {
      const app = new Hono();
      app.onError(onError);
      registerAccountFileRoutes({ app, getFileFn });
      for (const path of ["/files", "/files/file-1/download"]) {
        const response = await app.request(`http://account.test${path}`);
        expect(response.status, path).toBe(500);
        for (const [name, value] of Object.entries(FILE_RESPONSE_ISOLATION_HEADERS)) {
          expect(response.headers.get(name), `${path} ${name}`).toBe(value);
        }
        expect(response.headers.get("content-disposition"), path).toBeNull();
        expect((await response.json()).error.code, path).toBe("FILEFN_INTERNAL_ERROR");
      }
    }
    expect(onError.mock.calls.map(([error]) => error.message)).toEqual([
      "database pool down",
      "database pool down",
      "router crashed",
      "router crashed"
    ]);
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
      ["/files/share-links/secret%2Ftoken/download", "/files/share-links/:token/:token/download"],
      ["/files/share-links%2F%FFsecret-token/download", "/files/share-links/:token/download"],
      ["/files/share-links%2f%FFsecret-token/download", "/files/share-links/:token/download"],
      ["/files/share-links%FF%2Fsecret-token/download", "/files/share-links:token/:token/download"],
      ["/files/%2525252573hare-links/secret-token/download", "/files/share-links/:token/download"],
      ["/files/share-links%C0%AFsecret-token/download", "/files/share-links:token/download"],
      ["/files/share-links/%E2%80%AEsecret-token/download", "/files/share-links/:token/download"],
      ["/files/xshare-linksSECRET-token/download", "/files/xshare-links:token/download"],
      ["/files/file-1.share-links.secret-token", "/files/file-1.share-links:token"],
      ["/files/share-lin%E2%84%AAs/secret-token/download", "/files/share-lin%E2%84%AAs/:token/download"],
      ["/files/proxy/share-lin%E2%84%AAs/secret-token/download", "/files/proxy/share-lin%E2%84%AAs/:token/download"],
      ["/files/file-1/share-lin%E2%84%AAs/secret-token", "/files/file-1/share-lin%E2%84%AAs/:token"],
      ["/files/share-lin\u212As/secret-token", "/files/share-lin\u212As/:token"],
      ["/files/%EF%BD%93hare-links/secret-token", "/files/%EF%BD%93hare-links/:token"],
      ["/files/%C5%BFhare-links/secret-token", "/files/%C5%BFhare-links/:token"],
      ["/files/share-lin%E2%84%AAssecret-token/download", "/files/:token/download"],
      ["/files/share-lin%E2%84%AAs%FF/secret-token", "/files/:token/:token"]
    ];
    for (const [input, expected] of cases) {
      const redacted = redactFileRequestPath(input);
      expect(redacted, input).toBe(expected);
      expect(redacted, input).not.toContain("secret");
    }
  });

  it("redacts share-links paths encoded to any depth from 1 through 12", () => {
    for (let depth = 1; depth <= 12; depth += 1) {
      const nest = (hex: string) => `%${"25".repeat(depth - 1)}${hex}`;
      for (const input of [
        `/files/${nest("73")}hare-links/secret-token/download`,
        `/files/share-links${nest("2F")}secret-token/download`,
        `/files/share-links${nest("2f")}%FFsecret-token${nest("2F")}download`,
        `${nest("2F")}${nest("66")}iles${nest("2F")}share${nest("2D")}links${nest("2F")}secret-token`
      ]) {
        expect(redactFileRequestPath(input), `${depth}: ${input}`).not.toContain("secret");
      }
    }
  });

  it("redacts and normalizes maximum-length nested paths in linear time", () => {
    const layers = 64_000;
    const marked = `/files/%${"25".repeat(layers)}73hare-links/secret-token/download`;
    const unrelatedMarked = `/unhandled/%${"25".repeat(layers)}73hare-links/secret-token`;
    const unrelated = `/auth/%${"25".repeat(layers)}41/session`;
    const started = performance.now();
    expect(redactFileRequestPath(marked)).toBe("/files/share-links/:token/download");
    expect(redactFileRequestPath(unrelatedMarked)).toBe("/unhandled/share-links/:token");
    expect(redactFileRequestPath(unrelated)).toBe(unrelated);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("never lets a generated share token survive, whatever the per-character encoding", () => {
    let seed = 0x5eed538;
    const random = (limit: number) => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return seed % limit;
    };
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const invalidBytes = ["%FF", "%C0%AF", "%E2%80%AE", "%zz", "%"];
    const encode = (char: string) => {
      const depth = random(13);
      if (depth === 0) return char;
      const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
      return `%${"25".repeat(depth - 1)}${random(2) ? hex.toUpperCase() : hex}`;
    };
    const templates = [
      "/files/share-links/{t}/download",
      "/files/proxy/share-links/{t}/download",
      "/files/file-1/share-links/{t}",
      "/files/share-links//{t}/download/"
    ];
    for (let iteration = 0; iteration < 2000; iteration += 1) {
      const token = Array.from(
        { length: 12 + random(20) },
        () => alphabet[random(alphabet.length)]
      ).join("");
      const plain = templates[random(templates.length)]!.replace("{t}", token);
      const withInvalid = iteration % 2 === 1;
      const path = [...plain]
        .map((char) => {
          const encoded = encode(char);
          if (!withInvalid || char !== "/") return encoded;
          const invalid = invalidBytes[random(invalidBytes.length)]!;
          return random(2) ? `${invalid}${encoded}` : `${encoded}${invalid}`;
        })
        .join("");
      const redacted = redactFileRequestPath(path);
      expect(redacted, path).not.toContain(token);
      expect(decodeURIComponentSafely(redacted), path).not.toContain(token);
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

function decodeURIComponentSafely(value: string): string {
  let current = value;
  for (let pass = 0; pass < 32; pass += 1) {
    const decoded = current.replace(/%[0-9a-f]{2}/gi, (escape) => {
      try {
        return decodeURIComponent(escape);
      } catch {
        return escape;
      }
    });
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}
