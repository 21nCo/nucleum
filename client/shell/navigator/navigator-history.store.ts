import { get, writable } from "svelte/store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { datafn } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  createNavigatorHistory,
  normalizeNavigatorHistory,
  pruneNavigatorHistory,
  recordNavigatorVisit,
  type NavigatorHistory,
  type NavigatorHistoryVisit
} from "@nucleum/shell/navigator/navigator-history";

const FLUSH_DELAY_MS = 1500;

type HistorySignal = ReturnType<typeof datafn.kv.signal<NavigatorHistory>>;

const historyLocal = writable<NavigatorHistory>(createNavigatorHistory());
let historySignal: HistorySignal | undefined;
let pendingVisits: NavigatorHistoryVisit[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function applyPendingVisits(base: NavigatorHistory) {
  return pendingVisits.reduce(recordNavigatorVisit, base);
}

function ensureSignal() {
  if (historySignal) return historySignal;
  historySignal = datafn.kv.signal<NavigatorHistory>(
    Resource.navigatorHistory,
    { defaultValue: createNavigatorHistory() }
  );
  historySignal.subscribe((value) => {
    historyLocal.set(applyPendingVisits(normalizeNavigatorHistory(value)));
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

/** Writes batched visits on top of the latest stored history. */
function flushNavigatorHistory() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = undefined;
  if (pendingVisits.length === 0 || !historySignal) return;
  const base = normalizeNavigatorHistory(historySignal.get());
  const next = pruneNavigatorHistory(applyPendingVisits(base), Date.now());
  pendingVisits = [];
  historyLocal.set(next);
  void datafn.kv
    .set(Resource.navigatorHistory, next)
    .then((result) => {
      if (!result.ok) {
        logger.error({ at: "navigatorHistory.flush", error: result.error });
      }
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
    pendingVisits = [...pendingVisits, visit];
    historyLocal.set(next);
    scheduleFlush();
  }
};
