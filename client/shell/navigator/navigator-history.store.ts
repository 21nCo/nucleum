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

type HistorySignal = ReturnType<typeof datafn.kv.signal<NavigatorHistory>>;

const historyLocal = writable<NavigatorHistory>(createNavigatorHistory());
let historySignal: HistorySignal | undefined;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

const writer = createNavigatorHistoryWriter({
  namespace: () => get(datafnRuntime)?.namespace ?? null,
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
  let namespace = get(datafnRuntime)?.namespace ?? null;
  datafnRuntime.subscribe((runtime) => {
    const nextNamespace = runtime?.namespace ?? null;
    if (nextNamespace === namespace) return;
    namespace = nextNamespace;
    writer.retainCurrentNamespace();
    if (writer.pendingCount() > 0) scheduleFlush();
  });
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushNavigatorHistory);
  }
  return historySignal;
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushNavigatorHistory, FLUSH_DELAY_MS);
}

/** Writes batched visits on top of the stored history read from DataFn KV. */
function flushNavigatorHistory() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = undefined;
  if (writer.pendingCount() === 0 || !historySignal) return;
  void writer
    .flush()
    .then((next) => {
      if (next) historyLocal.set(writer.applyPending(next));
    })
    .catch((error) => logger.error({ at: "navigatorHistory.flush", error }));
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
