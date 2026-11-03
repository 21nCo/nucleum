import {
  normalizeNavigatorHistory,
  pruneNavigatorHistory,
  recordNavigatorVisit,
  type NavigatorHistory,
  type NavigatorHistoryVisit
} from "@nucleum/shell/navigator/navigator-history";

/**
 * Storage operations used to persist navigator history. `namespace` names the data
 * namespace that reads and writes currently target, or null before one is active.
 */
export type NavigatorHistoryStorage = {
  namespace: () => string | null;
  read: () => Promise<unknown>;
  write: (history: NavigatorHistory) => Promise<boolean>;
  now: () => number;
};

/** History written by a flush and the namespace it was written to. */
export type NavigatorHistoryFlushResult = {
  history: NavigatorHistory;
  namespace: string;
};

/** Serialized writer that merges pending visits into the stored history. */
export type NavigatorHistoryWriter = {
  /** Queues a visit for the current namespace until a flush persists it. */
  add: (visit: NavigatorHistoryVisit) => void;
  /** Applies the current namespace's unpersisted visits on top of a stored history. */
  applyPending: (base: NavigatorHistory) => NavigatorHistory;
  /**
   * Drops queued visits recorded in a namespace other than the current one and
   * binds visits recorded before any namespace was active to the current one.
   */
  retainCurrentNamespace: () => void;
  /**
   * Persists queued visits after any flush already in progress. Resolves to the
   * written history only when the namespace is unchanged after the write.
   */
  flush: () => Promise<NavigatorHistoryFlushResult | undefined>;
  /** Number of visits not yet persisted. */
  pendingCount: () => number;
};

type PendingVisit = {
  visit: NavigatorHistoryVisit;
  namespace: string | null;
};

/**
 * Creates a writer that runs one flush at a time. Each flush reads the stored
 * history, merges the visits queued so far and writes the result; visits stay queued
 * until their write succeeds, so overlapping or failed flushes never drop them.
 * Visits belong to the namespace they were recorded in: visits from another
 * namespace are dropped, visits recorded before any namespace was active are bound
 * to the first namespace that becomes active, and nothing is written while no namespace is active or after the
 * namespace changed during a flush.
 */
export function createNavigatorHistoryWriter(
  storage: NavigatorHistoryStorage
): NavigatorHistoryWriter {
  let pending: PendingVisit[] = [];
  let queue: Promise<NavigatorHistoryFlushResult | undefined> =
    Promise.resolve(undefined);

  const belongsTo = (item: PendingVisit, namespace: string | null) =>
    item.namespace === null || item.namespace === namespace;

  const applyVisits = (base: NavigatorHistory, items: PendingVisit[]) =>
    items.map((item) => item.visit).reduce(recordNavigatorVisit, base);

  function retainCurrentNamespace() {
    const namespace = storage.namespace();
    if (namespace === null) return;
    pending = pending.filter((item) => belongsTo(item, namespace));
    pending.forEach((item) => {
      if (item.namespace === null) item.namespace = namespace;
    });
  }

  async function writeBatch() {
    const namespace = storage.namespace();
    if (namespace === null) return;
    retainCurrentNamespace();
    const batch = pending;
    if (batch.length === 0) return;
    const base = normalizeNavigatorHistory(await storage.read());
    if (storage.namespace() !== namespace) return;
    const next = pruneNavigatorHistory(applyVisits(base, batch), storage.now());
    if (!(await storage.write(next))) return;
    pending = pending.filter((item) => !batch.includes(item));
    if (storage.namespace() !== namespace) return;
    return { history: next, namespace };
  }

  return {
    add(visit) {
      pending = [...pending, { visit, namespace: storage.namespace() }];
    },
    applyPending(base) {
      const namespace = storage.namespace();
      return applyVisits(
        base,
        pending.filter((item) => belongsTo(item, namespace))
      );
    },
    retainCurrentNamespace,
    flush() {
      queue = queue.then(writeBatch, writeBatch);
      return queue;
    },
    pendingCount() {
      return pending.length;
    }
  };
}
