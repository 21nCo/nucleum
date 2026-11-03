/** Kind of navigation target tracked by the navigator history. */
export type NavigatorHistoryKind = "resource" | "page";

/** Visit statistics for one resource or page path. */
export type NavigatorHistoryEntry = {
  kind: NavigatorHistoryKind;
  opens: number[];
  lastOpenedAt: number;
  from: Record<string, number>;
};

/** Versioned navigator history document stored in DataFn KV. */
export type NavigatorHistory = {
  version: typeof NAVIGATOR_HISTORY_VERSION;
  entries: Record<string, NavigatorHistoryEntry>;
};

/** One recorded open of a resource or page path. */
export type NavigatorHistoryVisit = {
  id: string;
  kind: NavigatorHistoryKind;
  at: number;
  origin?: string;
};

/** Ranked navigator history entry. */
export type RankedNavigatorHistoryEntry = {
  id: string;
  entry: NavigatorHistoryEntry;
  score: number;
};

export const NAVIGATOR_HISTORY_VERSION = 1;
export const NAVIGATOR_HISTORY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
export const NAVIGATOR_HISTORY_MAX_OPENS = 100;
export const NAVIGATOR_HISTORY_MAX_ENTRIES = 300;
export const NAVIGATOR_HISTORY_MAX_ORIGINS = 50;
export const NAVIGATOR_HISTORY_DUPLICATE_MS = 2000;

/** Creates an empty navigator history document. */
export function createNavigatorHistory(): NavigatorHistory {
  return { version: NAVIGATOR_HISTORY_VERSION, entries: {} };
}

/** Reads a stored value into a valid history document, discarding malformed entries. */
export function normalizeNavigatorHistory(value: unknown): NavigatorHistory {
  const history = createNavigatorHistory();
  if (!isObject(value) || value.version !== NAVIGATOR_HISTORY_VERSION) {
    return history;
  }
  if (!isObject(value.entries)) return history;
  Object.entries(value.entries).forEach(([id, entry]) => {
    if (!isObject(entry)) return;
    if (entry.kind !== "resource" && entry.kind !== "page") return;
    const opens = Array.isArray(entry.opens)
      ? entry.opens.filter((at): at is number => Number.isFinite(at))
      : [];
    const from: Record<string, number> = {};
    if (isObject(entry.from)) {
      Object.entries(entry.from).forEach(([origin, count]) => {
        if (typeof count === "number" && count > 0) from[origin] = count;
      });
    }
    history.entries[id] = {
      kind: entry.kind,
      opens,
      lastOpenedAt: Number.isFinite(entry.lastOpenedAt)
        ? (entry.lastOpenedAt as number)
        : (opens[opens.length - 1] ?? 0),
      from
    };
  });
  return history;
}

/** Number of opens inside the ranking window. */
export function navigatorHistoryScore(
  entry: NavigatorHistoryEntry,
  now: number
): number {
  const since = now - NAVIGATOR_HISTORY_WINDOW_MS;
  return entry.opens.filter((at) => at >= since).length;
}

/** Ranks entries by frequency in the last 90 days, then by recency. */
export function rankNavigatorHistory(
  history: NavigatorHistory,
  now: number,
  limit?: number
): RankedNavigatorHistoryEntry[] {
  const ranked = Object.entries(history.entries)
    .map(([id, entry]) => ({
      id,
      entry,
      score: navigatorHistoryScore(entry, now)
    }))
    .filter((item) => item.score > 0)
    .sort(compareRanked);
  return limit === undefined ? ranked : ranked.slice(0, limit);
}

/** Ranks entries most often opened from the given origin record. */
export function rankNavigatorHistoryFrom(
  history: NavigatorHistory,
  origin: string,
  now: number,
  limit?: number
): RankedNavigatorHistoryEntry[] {
  const ranked = Object.entries(history.entries)
    .filter(([id, entry]) => id !== origin && (entry.from[origin] ?? 0) > 0)
    .map(([id, entry]) => ({
      id,
      entry,
      score: entry.from[origin]
    }))
    .sort(compareRanked);
  return limit === undefined ? ranked : ranked.slice(0, limit);
}

/** Drops expired opens, empty entries and the lowest-ranked entries over the cap. */
export function pruneNavigatorHistory(
  history: NavigatorHistory,
  now: number
): NavigatorHistory {
  const since = now - NAVIGATOR_HISTORY_WINDOW_MS;
  const entries: Record<string, NavigatorHistoryEntry> = {};
  Object.entries(history.entries).forEach(([id, entry]) => {
    const opens = entry.opens
      .filter((at) => at >= since)
      .slice(-NAVIGATOR_HISTORY_MAX_OPENS);
    if (opens.length === 0) return;
    entries[id] = { ...entry, opens, from: pruneOrigins(entry.from) };
  });
  const kept = rankNavigatorHistory({ ...history, entries }, now).slice(
    0,
    NAVIGATOR_HISTORY_MAX_ENTRIES
  );
  return {
    version: NAVIGATOR_HISTORY_VERSION,
    entries: Object.fromEntries(kept.map((item) => [item.id, item.entry]))
  };
}

/**
 * Records a visit and prunes the result. Returns the same history object when the
 * visit repeats the latest open of that id within the duplicate window.
 */
export function recordNavigatorVisit(
  history: NavigatorHistory,
  visit: NavigatorHistoryVisit
): NavigatorHistory {
  if (!visit.id) return history;
  const existing = history.entries[visit.id];
  if (
    existing &&
    Math.abs(visit.at - existing.lastOpenedAt) < NAVIGATOR_HISTORY_DUPLICATE_MS
  ) {
    return history;
  }
  const from = { ...(existing?.from ?? {}) };
  if (visit.origin && visit.origin !== visit.id) {
    from[visit.origin] = (from[visit.origin] ?? 0) + 1;
  }
  const entry: NavigatorHistoryEntry = {
    kind: visit.kind,
    opens: [...(existing?.opens ?? []), visit.at].sort((a, b) => a - b),
    lastOpenedAt: Math.max(existing?.lastOpenedAt ?? 0, visit.at),
    from
  };
  return pruneNavigatorHistory(
    { ...history, entries: { ...history.entries, [visit.id]: entry } },
    visit.at
  );
}

function compareRanked(
  a: RankedNavigatorHistoryEntry,
  b: RankedNavigatorHistoryEntry
) {
  if (b.score !== a.score) return b.score - a.score;
  return b.entry.lastOpenedAt - a.entry.lastOpenedAt;
}

function pruneOrigins(from: Record<string, number>) {
  const origins = Object.entries(from);
  if (origins.length <= NAVIGATOR_HISTORY_MAX_ORIGINS) return from;
  return Object.fromEntries(
    origins.sort((a, b) => b[1] - a[1]).slice(0, NAVIGATOR_HISTORY_MAX_ORIGINS)
  );
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
