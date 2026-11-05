import { get, writable } from "svelte/store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  createNavigatorHistory,
  normalizeNavigatorHistory,
  recordNavigatorVisit,
  type NavigatorHistory,
  type NavigatorHistoryVisit
} from "@nucleum/shell/navigator/navigator-history";
import { createNavigatorHistoryWriter } from "@nucleum/shell/navigator/navigator-history-writer";

const FLUSH_DELAY_MS = 1500;
const FLUSH_MAX_WAIT_MS = 10000;
const RETRY_BASE_DELAY_MS = 2000;
const RETRY_MAX_DELAY_MS = 60000;

type HistorySignal = ReturnType<typeof datafn.kv.signal<NavigatorHistory>>;

const historyLocal = writable<NavigatorHistory>(createNavigatorHistory());
let historySignal: HistorySignal | undefined;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let firstQueuedAt: number | undefined;
let failedFlushes = 0;

function currentNamespace() {
  return get(datafnRuntime)?.namespace ?? null;
}

const writer = createNavigatorHistoryWriter({
  namespace: currentNamespace,
  read: () => datafn.kv.get(Resource.navigatorHistory),
  write: async (history) => {
    const result = await datafn.kv.set(Resource.navigatorHistory, history);
    if (!result.ok) {
      logger.error({ at: "navigatorHistory.flush", error: result.error });
    }
    return result.ok;
  },
  now: () => Date.now()
});

function ensureSignal() {
  if (historySignal) return historySignal;
  historySignal = datafn.kv.signal<NavigatorHistory>(
    Resource.navigatorHistory,
    { defaultValue: createNavigatorHistory() }
  );
  historySignal.subscribe((value) => {
    historyLocal.set(writer.applyPending(normalizeNavigatorHistory(value)));
  });
  let namespace = currentNamespace();
  datafnRuntime.subscribe((runtime) => {
    const nextNamespace = runtime?.namespace ?? null;
    if (nextNamespace === namespace) return;
    namespace = nextNamespace;
    writer.retainCurrentNamespace();
    if (writer.pendingCount() > 0) scheduleFlush();
  });
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushNavigatorHistory);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushNavigatorHistory();
    });
  }
  return historySignal;
}

function setFlushTimer(delay: number) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushNavigatorHistory, delay);
}

function scheduleFlush() {
  const now = Date.now();
  firstQueuedAt ??= now;
  setFlushTimer(
    Math.max(
      0,
      Math.min(FLUSH_DELAY_MS, firstQueuedAt + FLUSH_MAX_WAIT_MS - now)
    )
  );
}

function scheduleRetry() {
  if (writer.pendingCount() === 0 || currentNamespace() === null) return;
  failedFlushes++;
  setFlushTimer(
    Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** (failedFlushes - 1))
  );
}

/**
 * Writes batched visits on top of the stored history read from DataFn KV. A failed
 * write is retried with a growing delay while visits remain queued.
 */
function flushNavigatorHistory() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = undefined;
  firstQueuedAt = undefined;
  if (writer.pendingCount() === 0 || !historySignal) return;
  void writer
    .flush()
    .then((result) => {
      if (!result) {
        scheduleRetry();
        return;
      }
      failedFlushes = 0;
      if (result.namespace !== currentNamespace()) return;
      historyLocal.set(writer.applyPending(result.history));
    })
    .catch((error) => {
      logger.error({ at: "navigatorHistory.flush", error });
      scheduleRetry();
    });
}

/**
 * Frequency-ranked history of opened resources and page views, persisted in the
 * `navigatorHistory` DataFn KV record. Visits are batched before being written.
 */
export const navigatorHistory = {
  subscribe(run: (value: NavigatorHistory) => void) {
    ensureSignal();
    return historyLocal.subscribe(run);
  },
  get() {
    ensureSignal();
    return get(historyLocal);
  },
  /** Records an opened resource, counting the record it was opened from. */
  recordResource(id: string, origin?: string) {
    navigatorHistory.record({ id, kind: "resource", at: Date.now(), origin });
  },
  /** Records a visited page path such as `calendar/classic/year`. */
  recordPage(path: string) {
    navigatorHistory.record({ id: path, kind: "page", at: Date.now() });
  },
  record(visit: NavigatorHistoryVisit) {
    ensureSignal();
    const current = get(historyLocal);
    const next = recordNavigatorVisit(current, visit);
    if (next === current) return;
    writer.add(visit);
    historyLocal.set(next);
    scheduleFlush();
  }
};
