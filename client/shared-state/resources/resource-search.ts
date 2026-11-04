import { get } from "svelte/store";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { activeResourceFilter } from "@nucleum/datafn/resource-filters";
import { isRecordId } from "@nucleum/datafn/resource.utils";
import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";

/** One raw match returned by the DataFn search index. */
export type ResourceSearchMatch = {
  id: string;
  resource: string;
  score: number;
  data: Record<string, unknown>;
};

/** A ranked resource search result. */
export type ResourceSearchHit = {
  id: string;
  resource: string;
  record: Record<string, any>;
  relevance: number;
  score: number;
};

/**
 * Extra weight for a record id, added to its text relevance. Callers use it
 * to rank by their own signal, such as how often the navigator opened it.
 */
export type ResourceSearchBoost = (id: string) => number;

/** Parameters of one resource search. */
export type ResourceSearchParams = {
  query: string;
  limit?: number;
  resources?: string[];
  boost?: ResourceSearchBoost;
  /** Aborts the search, for example when its query is superseded. */
  signal?: AbortSignal;
};

const DEFAULT_LIMIT = 20;
const CANDIDATE_FACTOR = 3;

/** How long a search may run before it fails with a timeout. */
export const RESOURCE_SEARCH_TIMEOUT_MS = 10_000;

/** Raised when a resource search does not settle in time. */
export class ResourceSearchTimeoutError extends Error {
  constructor() {
    super("Resource search timed out");
    this.name = "ResourceSearchTimeoutError";
  }
}

function abortReason(signal: AbortSignal) {
  return signal.reason ?? new DOMException("Search aborted", "AbortError");
}

function untilAborted<T>(request: Promise<T>, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      request.catch(() => undefined);
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    request.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function resolveRecordLabel(record: Record<string, unknown>) {
  const label = record.label ?? record.event ?? record.name;
  return typeof label === "string" ? label : "";
}

/**
 * Text relevance of a record for a query: the index score scaled to 0..1,
 * plus a bonus when the label is the query (1), starts with it (0.5) or
 * contains it (0.25).
 */
export function scoreResourceSearchText(
  match: ResourceSearchMatch,
  query: string,
  maxScore: number
) {
  const normalizedQuery = query.trim().toLowerCase();
  const label = resolveRecordLabel(match.data).trim().toLowerCase();
  const indexScore = maxScore > 0 ? Math.max(0, match.score) / maxScore : 0;
  if (!normalizedQuery || !label) return indexScore;
  if (label === normalizedQuery) return indexScore + 1;
  if (label.startsWith(normalizedQuery)) return indexScore + 0.5;
  if (label.includes(normalizedQuery)) return indexScore + 0.25;
  return indexScore;
}

/**
 * Drops inactive and non-record matches, then orders the rest by text
 * relevance plus the optional boost. Ties keep the index order.
 */
export function rankResourceSearchMatches(
  matches: ResourceSearchMatch[],
  query: string,
  boost?: ResourceSearchBoost
): ResourceSearchHit[] {
  const seen = new Set<string>();
  const candidates = matches.filter((match) => {
    const id = match.data?.id?.toString() ?? match.id;
    if (!id || !isRecordId(id) || seen.has(id)) return false;
    if (!activeResourceFilter(match.data ?? {})) return false;
    seen.add(id);
    return true;
  });
  const maxScore = Math.max(0, ...candidates.map((match) => match.score ?? 0));
  return candidates
    .map((match, index) => {
      const id = match.data?.id?.toString() ?? match.id;
      const relevance = scoreResourceSearchText(match, query, maxScore);
      return {
        index,
        hit: {
          id,
          resource: match.resource,
          record: match.data as Record<string, any>,
          relevance,
          score: relevance + (boost?.(id) ?? 0)
        }
      };
    })
    .sort((a, b) => b.hit.score - a.hit.score || a.index - b.index)
    .map((item) => item.hit);
}

/**
 * Searches the product's searchable record types in the local index, or
 * remotely when offline storage is off (sync-direct). The
 * super bar ranks by text relevance; the navigator passes a history boost.
 * Resolves to an empty list for an empty query or when nothing matches.
 * Rejects when the caller aborts it, or with `ResourceSearchTimeoutError`
 * when it does not settle within `RESOURCE_SEARCH_TIMEOUT_MS`.
 */
export async function searchResources(
  params: ResourceSearchParams
): Promise<ResourceSearchHit[]> {
  const query = params.query.trim();
  const resources =
    params.resources ?? requireProductConfig().searchResources ?? [];
  if (!query || resources.length === 0) return [];
  if (params.signal?.aborted) throw abortReason(params.signal);
  const limit = params.limit ?? DEFAULT_LIMIT;
  const candidateLimit = limit * CANDIDATE_FACTOR;
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(params.signal?.reason);
  params.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new ResourceSearchTimeoutError()),
    RESOURCE_SEARCH_TIMEOUT_MS
  );
  let result: Awaited<ReturnType<typeof datafn.search>>;
  try {
    result = await untilAborted(
      Promise.resolve().then(() =>
        datafn.search({
          query,
          resources,
          limit: candidateLimit,
          limitPerResource: candidateLimit,
          source:
            get(datafnRuntime)?.mode === "sync-direct" ? "remote" : "local",
          prefix: true,
          fuzzy: 0.2,
          signal: controller.signal
        })
      ),
      controller.signal
    );
  } finally {
    clearTimeout(timer);
    params.signal?.removeEventListener("abort", forwardAbort);
  }
  return rankResourceSearchMatches(
    (result.results ?? []) as ResourceSearchMatch[],
    query,
    params.boost
  ).slice(0, limit);
}
