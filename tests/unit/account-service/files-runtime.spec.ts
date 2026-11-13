import { describe, expect, it, vi } from "vitest";
import {
  AuthFnCsrfInvalidError,
  AuthFnPlacementDirectoryUnavailableError,
  AuthFnRegionMismatchError,
  AuthFnRoutingCellUnavailableError,
  AuthFnSessionExpiredError,
  AuthFnUnauthenticatedError
} from "authfn";
import {
  closeAfterDeferredWork,
  createFileDeferredWork
} from "../../../services/account/src/files/deferred";
import {
  createAccountFileSessionResolver,
  type AccountFileAuth
} from "../../../services/account/src/files/server";

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
    // The tracked task plus the close are both handed to waitUntil.
    expect(waitUntil).toHaveLength(2);

    // Deferred work hands in more work before it settles (event fan-out).
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
  function resolverThrowing(error: unknown) {
    const auth = {
      provider: { authenticate: vi.fn(async () => Promise.reject(error)) },
      authorizeMutation: vi.fn(async () => Promise.reject(error))
    } as unknown as AccountFileAuth;
    return createAccountFileSessionResolver(auth);
  }
  const get = () => new Request("http://account.test/files");

  it("maps session-absence AuthFn errors to no principal (401)", async () => {
    for (const error of [
      new AuthFnUnauthenticatedError(),
      new AuthFnSessionExpiredError(),
      new AuthFnRegionMismatchError()
    ]) {
      await expect(resolverThrowing(error)(get()), error.code).resolves.toBeNull();
    }
  });

  it("lets AuthFn infrastructure failures propagate instead of answering 401", async () => {
    for (const error of [
      new AuthFnPlacementDirectoryUnavailableError(),
      new AuthFnRoutingCellUnavailableError()
    ]) {
      await expect(resolverThrowing(error)(get()), error.code).rejects.toBe(error);
    }
  });

  it("maps a CSRF failure on a write to 403", async () => {
    const resolve = resolverThrowing(new AuthFnCsrfInvalidError());
    await expect(
      resolve(new Request("http://account.test/files/upload/init", { method: "POST" }))
    ).rejects.toMatchObject({ code: "FILEFN_FORBIDDEN" });
  });
});
