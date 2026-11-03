import {
  normalizeNavigatorHistory,
  pruneNavigatorHistory,
  recordNavigatorVisit,
  type NavigatorHistory,
  type NavigatorHistoryVisit
} from "@nucleum/shell/navigator/navigator-history";

/** Storage operations used to persist navigator history. */
export type NavigatorHistoryStorage = {
  read: () => Promise<unknown>;
  write: (history: NavigatorHistory) => Promise<boolean>;
  now: () => number;
};

/** Serialized writer that merges pending visits into the stored history. */
export type NavigatorHistoryWriter = {
  /** Queues a visit until a flush persists it. */
  add: (visit: NavigatorHistoryVisit) => void;
  /** Applies visits not yet persisted on top of a stored history. */
  applyPending: (base: NavigatorHistory) => NavigatorHistory;
  /** Persists queued visits after any flush already in progress. */
  flush: () => Promise<NavigatorHistory | undefined>;
  /** Number of visits not yet persisted. */
  pendingCount: () => number;
};

/**
 * Creates a writer that runs one flush at a time. Each flush reads the stored
 * history, merges the visits queued so far and writes the result; visits stay queued
 * until their write succeeds, so overlapping or failed flushes never drop them.
 */
export function createNavigatorHistoryWriter(
  storage: NavigatorHistoryStorage
): NavigatorHistoryWriter {
  let pending: NavigatorHistoryVisit[] = [];
  let queue: Promise<NavigatorHistory | undefined> = Promise.resolve(undefined);

  const applyVisits = (
    base: NavigatorHistory,
    visits: NavigatorHistoryVisit[]
  ) => visits.reduce(recordNavigatorVisit, base);

  async function writeBatch() {
    const batch = pending;
    if (batch.length === 0) return;
    const base = normalizeNavigatorHistory(await storage.read());
    const next = pruneNavigatorHistory(applyVisits(base, batch), storage.now());
    if (!(await storage.write(next))) return;
    pending = pending.filter((visit) => !batch.includes(visit));
    return next;
  }

  return {
    add(visit) {
      pending = [...pending, visit];
    },
    applyPending(base) {
      return applyVisits(base, pending);
    },
    flush() {
      queue = queue.then(writeBatch, writeBatch);
      return queue;
    },
    pendingCount() {
      return pending.length;
    }
  };
}
