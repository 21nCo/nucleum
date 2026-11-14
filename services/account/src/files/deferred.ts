import type { FileFnRuntime } from "@filefn/server";

/** Minimal Workers execution context used to extend the request lifetime. */
export interface WaitUntilContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Tracks FileFn background work so request-scoped resources (database
 * connections, services) close only after that work settles. Each task is
 * also handed to `ctx.waitUntil` when a context is given.
 */
export interface FileDeferredWork {
  /** Runtime hook to pass to FileFn. */
  runtime: FileFnRuntime;
  /** Number of deferred tasks that have not settled yet. */
  pending(): number;
  /**
   * Resolves once every deferred task has settled, including tasks handed in
   * by other deferred work while waiting.
   */
  settled(): Promise<void>;
}

/**
 * Creates the FileFn `runtime.defer` hook for one request. Deferred work is
 * tracked until it settles and, when `ctx` is given, handed to
 * `ctx.waitUntil` so the Worker stays alive for it. A task that rejects is
 * passed to `onError` once; it still counts as settled so request resources
 * close.
 */
export function createFileDeferredWork(
  ctx?: WaitUntilContext,
  onError?: (error: unknown) => void
): FileDeferredWork {
  const pending = new Set<Promise<void>>();
  return {
    runtime: {
      defer(work) {
        const tracked: Promise<void> = Promise.resolve(work).then(
          () => {
            pending.delete(tracked);
          },
          (error: unknown) => {
            pending.delete(tracked);
            reportSafely(onError, error);
          }
        );
        pending.add(tracked);
        ctx?.waitUntil(tracked);
      }
    },
    pending: () => pending.size,
    async settled() {
      while (pending.size > 0) {
        await Promise.allSettled(pending);
      }
    }
  };
}

function reportSafely(
  onError: ((error: unknown) => void) | undefined,
  error: unknown
): void {
  try {
    onError?.(error);
  } catch {
    return;
  }
}

/**
 * Closes request resources. With deferred work still pending, the close runs
 * after that work settles and is handed to `ctx.waitUntil`, so the response
 * is not held back; otherwise it runs before returning. A close failure in the
 * waitUntil path is passed to `onError` instead of rejecting.
 */
export async function closeAfterDeferredWork(input: {
  ctx?: WaitUntilContext;
  deferred: FileDeferredWork;
  close: () => Promise<void>;
  onError: (error: unknown) => void;
}): Promise<void> {
  const { ctx, deferred, close, onError } = input;
  if (ctx && deferred.pending() > 0) {
    ctx.waitUntil(
      deferred
        .settled()
        .then(close)
        .catch((error: unknown) => {
          onError(error);
        })
    );
    return;
  }
  await close();
}
