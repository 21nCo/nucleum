import { writable, type Readable } from "svelte/store";

/** Records per page: the live first page's limit and each later page's limit. */
export const PAGED_LIST_PAGE_SIZE = 50;

/** Largest `limit` a single page request may ask for (DataFn's default server `maxLimit`). */
export const PAGED_LIST_MAX_REQUEST_LIMIT = 100;

export type PagedListRecord = { id: string };

export type PagedListPageRequest = { offset: number; limit: number };

export type PagedListState<T> = {
  /** The live first page followed by the later pages, de-duplicated by id. */
  items: T[];
  /** Whether another page may exist: the first page and the last later page came back full. */
  hasMore: boolean;
  /** Whether a load-more or a refresh of the later pages is in flight. */
  isLoading: boolean;
  error: unknown;
};

export type PagedListStore<T> = Readable<PagedListState<T>> & {
  /** Sets the live first page; once later pages are loaded, each new first page array re-reads them. */
  setFirstPage(records: T[]): void;
  /** Fetches the next page, or queues it behind a refresh in flight. */
  loadMore(): Promise<void>;
  /** Drops the later pages and discards any request in flight. */
  reset(): void;
};

/** Concatenates pages in order, keeping the first record seen for each id. */
export function mergePagedRecords<T extends PagedListRecord>(
  ...pages: T[][]
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const page of pages) {
    for (const record of page) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      merged.push(record);
    }
  }
  return merged;
}

/**
 * Pages a list whose first page is a live DataFn signal and whose later pages
 * are plain offset queries, so each load-more reads only the next page and no
 * request exceeds the server's `maxLimit`.
 *
 * Offset is used rather than DataFn cursors because the local query executor
 * ignores `cursor` and always returns `nextCursor: null`, so cursors only page
 * against a remote.
 *
 * Later pages are not live. The live first page re-runs whenever DataFn sees a
 * change that may affect the query, and every new first page re-reads all
 * loaded later pages (in requests of at most `maxRequestLimit` records), so
 * edits, inserts and deletes reach them after one round trip. Until that
 * refresh lands a record pushed across the first page's boundary may be
 * briefly missing, and one pulled into the first page is shown once because
 * pages are merged by id with the first page winning. A fresh store per query
 * resets paging; `reset` does the same for the current query.
 */
export function createPagedListStore<T extends PagedListRecord>(options: {
  fetchPage: (request: PagedListPageRequest) => Promise<T[]>;
  pageSize?: number;
  maxRequestLimit?: number;
}): PagedListStore<T> {
  const maxRequestLimit = Math.max(
    1,
    options.maxRequestLimit ?? PAGED_LIST_MAX_REQUEST_LIMIT
  );
  const pageSize = Math.max(
    1,
    Math.min(options.pageSize ?? PAGED_LIST_PAGE_SIZE, maxRequestLimit)
  );
  let firstPage: T[] = [];
  let hasFirstPage = false;
  let laterPages: T[] = [];
  let loadedPageCount = 0;
  let isLastPageFull = true;
  let error: unknown = undefined;
  let generation = 0;
  let isBusy = false;
  let isRefreshQueued = false;
  let isLoadMoreQueued = false;
  const store = writable<PagedListState<T>>(resolveState());

  function resolveHasMore() {
    return (
      hasFirstPage &&
      firstPage.length >= pageSize &&
      isLastPageFull &&
      error === undefined
    );
  }

  function resolveState(): PagedListState<T> {
    return {
      items: mergePagedRecords(firstPage, laterPages),
      hasMore: resolveHasMore(),
      isLoading: isBusy,
      error
    };
  }

  function publish() {
    store.set(resolveState());
  }

  function runQueued() {
    if (isRefreshQueued) {
      isRefreshQueued = false;
      void refreshLaterPages();
    } else if (isLoadMoreQueued) {
      isLoadMoreQueued = false;
      void loadMore();
    }
  }

  async function loadMore() {
    if (!resolveHasMore()) return;
    if (isBusy) {
      isLoadMoreQueued = true;
      return;
    }
    const run = generation;
    isBusy = true;
    publish();
    try {
      const limit = pageSize;
      const records = await options.fetchPage({
        offset: pageSize + laterPages.length,
        limit
      });
      if (run !== generation) return;
      laterPages = [...laterPages, ...records];
      loadedPageCount += 1;
      isLastPageFull = records.length >= limit;
    } catch (e) {
      if (run === generation) error = e;
    } finally {
      if (run === generation) {
        isBusy = false;
        publish();
        runQueued();
      }
    }
  }

  async function refreshLaterPages() {
    if (isBusy) {
      isRefreshQueued = true;
      return;
    }
    if (loadedPageCount === 0) return;
    const run = generation;
    isBusy = true;
    publish();
    try {
      const target = loadedPageCount * pageSize;
      const records: T[] = [];
      let isFull = true;
      while (records.length < target) {
        const limit = Math.min(maxRequestLimit, target - records.length);
        const chunk = await options.fetchPage({
          offset: pageSize + records.length,
          limit
        });
        if (run !== generation) return;
        records.push(...chunk);
        if (chunk.length < limit) {
          isFull = false;
          break;
        }
      }
      laterPages = records;
      isLastPageFull = isFull;
      error = undefined;
    } catch (e) {
      if (run === generation) error = e;
    } finally {
      if (run === generation) {
        isBusy = false;
        publish();
        runQueued();
      }
    }
  }

  function setFirstPage(records: T[]) {
    if (hasFirstPage && records === firstPage) return;
    const isUpdate = hasFirstPage;
    firstPage = records;
    hasFirstPage = true;
    error = undefined;
    publish();
    if (isUpdate && (loadedPageCount > 0 || isBusy)) {
      void refreshLaterPages();
    }
  }

  function reset() {
    generation += 1;
    laterPages = [];
    loadedPageCount = 0;
    isLastPageFull = true;
    error = undefined;
    isBusy = false;
    isRefreshQueued = false;
    isLoadMoreQueued = false;
    publish();
  }

  return {
    subscribe: store.subscribe,
    setFirstPage,
    loadMore,
    reset
  };
}
