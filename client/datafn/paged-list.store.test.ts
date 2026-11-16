import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";

import {
  createPagedListStore,
  mergePagedRecords,
  PAGED_LIST_MAX_REQUEST_LIMIT,
  type PagedListPageRequest
} from "./paged-list.store";

type Row = { id: string; label?: string };

function rows(from: number, count: number, label = ""): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `r${from + index}`,
    label
  }));
}

function createSource(total: number) {
  let records = rows(0, total);
  const requests: PagedListPageRequest[] = [];
  const fetchPage = vi.fn(async (request: PagedListPageRequest) => {
    requests.push(request);
    return records.slice(request.offset, request.offset + request.limit);
  });
  return {
    fetchPage,
    requests,
    get records() {
      return records;
    },
    set records(next: Row[]) {
      records = next;
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function settle() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

describe("mergePagedRecords", () => {
  it("keeps page order and the first record seen for each id", () => {
    const merged = mergePagedRecords(
      [
        { id: "a", label: "first" },
        { id: "b", label: "first" }
      ],
      [
        { id: "b", label: "later" },
        { id: "c", label: "later" }
      ]
    );
    expect(merged).toEqual([
      { id: "a", label: "first" },
      { id: "b", label: "first" },
      { id: "c", label: "later" }
    ]);
  });
});

describe("createPagedListStore", () => {
  it("fetches only the next page on each load-more", async () => {
    const source = createSource(160);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));

    await pager.loadMore();
    await pager.loadMore();

    expect(source.requests).toEqual([
      { offset: 50, limit: 50 },
      { offset: 100, limit: 50 }
    ]);
    const state = get(pager);
    expect(state.items.map((row) => row.id)).toEqual(
      source.records.slice(0, 150).map((row) => row.id)
    );
    expect(state.hasMore).toBe(true);
  });

  it("stops after a short page", async () => {
    const source = createSource(70);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));

    await pager.loadMore();
    expect(get(pager).hasMore).toBe(false);
    expect(get(pager).items).toHaveLength(70);

    await pager.loadMore();
    expect(source.fetchPage).toHaveBeenCalledTimes(1);
  });

  it("does not page when the first page is short", async () => {
    const source = createSource(20);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records);

    await pager.loadMore();

    expect(get(pager).hasMore).toBe(false);
    expect(source.fetchPage).not.toHaveBeenCalled();
  });

  it("does not page before the first page arrives", async () => {
    const source = createSource(200);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });

    await pager.loadMore();

    expect(get(pager).hasMore).toBe(false);
    expect(source.fetchPage).not.toHaveBeenCalled();
  });

  it("never asks for more than the request limit", async () => {
    const source = createSource(1000);
    const pager = createPagedListStore<Row>({
      fetchPage: source.fetchPage,
      pageSize: 500
    });
    pager.setFirstPage(source.records.slice(0, PAGED_LIST_MAX_REQUEST_LIMIT));
    for (let i = 0; i < 5; i += 1) await pager.loadMore();
    pager.setFirstPage(source.records.slice(0, PAGED_LIST_MAX_REQUEST_LIMIT));
    await settle();

    expect(source.requests.length).toBeGreaterThan(5);
    for (const request of source.requests) {
      expect(request.limit).toBeLessThanOrEqual(PAGED_LIST_MAX_REQUEST_LIMIT);
    }
  });

  it("re-reads loaded pages in requests of at most the request limit when the first page changes", async () => {
    const source = createSource(400);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));
    for (let i = 0; i < 5; i += 1) await pager.loadMore();
    source.requests.length = 0;

    source.records = source.records.map((row) => ({ ...row, label: "edited" }));
    pager.setFirstPage(source.records.slice(0, 50));
    await settle();

    expect(source.requests).toEqual([
      { offset: 50, limit: 100 },
      { offset: 150, limit: 100 },
      { offset: 250, limit: 50 }
    ]);
    const state = get(pager);
    expect(state.items).toHaveLength(300);
    expect(state.items.every((row) => row.label === "edited")).toBe(true);
    expect(state.hasMore).toBe(true);
  });

  it("does not repeat a record that moves into the first page", async () => {
    const source = createSource(120);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));
    await pager.loadMore();

    source.records = source.records.slice(1);
    const refresh = deferred<Row[]>();
    source.fetchPage.mockImplementationOnce(() => refresh.promise);
    pager.setFirstPage(source.records.slice(0, 50));

    const ids = get(pager).items.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("r50");

    refresh.resolve(source.records.slice(50, 100));
    await settle();
    expect(get(pager).items.map((row) => row.id)).toEqual(
      source.records.slice(0, 100).map((row) => row.id)
    );
  });

  it("does not refresh when no later page is loaded", async () => {
    const source = createSource(200);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));
    pager.setFirstPage(source.records.slice(0, 50));
    await settle();

    expect(source.fetchPage).not.toHaveBeenCalled();
  });

  it("ignores the same first page array", async () => {
    const source = createSource(200);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    const firstPage = source.records.slice(0, 50);
    pager.setFirstPage(firstPage);
    await pager.loadMore();
    pager.setFirstPage(firstPage);
    await settle();

    expect(source.fetchPage).toHaveBeenCalledTimes(1);
  });

  it("re-reads a page that was in flight when the first page changed", async () => {
    const source = createSource(200);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));
    const page = deferred<Row[]>();
    source.fetchPage.mockImplementationOnce(() => page.promise);
    const loading = pager.loadMore();

    pager.setFirstPage(source.records.slice(0, 50));
    page.resolve(rows(50, 50, "stale"));
    await loading;
    await settle();

    expect(source.fetchPage).toHaveBeenCalledTimes(2);
    expect(
      get(pager)
        .items.slice(50)
        .every((row) => row.label === "")
    ).toBe(true);
  });

  it("runs a load-more requested during a refresh once the refresh lands", async () => {
    const source = createSource(300);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));
    await pager.loadMore();
    const refresh = deferred<Row[]>();
    source.fetchPage.mockImplementationOnce(() => refresh.promise);
    pager.setFirstPage(source.records.slice(0, 50));

    await pager.loadMore();
    expect(get(pager).isLoading).toBe(true);
    refresh.resolve(source.records.slice(50, 100));
    await settle();

    expect(source.requests.at(-1)).toEqual({ offset: 100, limit: 50 });
    expect(get(pager).items).toHaveLength(150);
  });

  it("reset drops later pages and ignores the request in flight", async () => {
    const source = createSource(300);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));
    await pager.loadMore();
    const page = deferred<Row[]>();
    source.fetchPage.mockImplementationOnce(() => page.promise);
    const loading = pager.loadMore();

    pager.reset();
    page.resolve(rows(100, 50));
    await loading;

    const state = get(pager);
    expect(state.items).toHaveLength(50);
    expect(state.isLoading).toBe(false);
    expect(state.hasMore).toBe(true);

    await pager.loadMore();
    expect(source.requests.at(-1)).toEqual({ offset: 50, limit: 50 });
  });

  it("stops paging after a failed page until the first page changes", async () => {
    const source = createSource(300);
    const pager = createPagedListStore<Row>({ fetchPage: source.fetchPage });
    pager.setFirstPage(source.records.slice(0, 50));
    source.fetchPage.mockRejectedValueOnce(new Error("limit exceeded"));

    await pager.loadMore();
    expect(get(pager).hasMore).toBe(false);
    expect(get(pager).error).toBeInstanceOf(Error);

    pager.setFirstPage(source.records.slice(0, 50));
    expect(get(pager).hasMore).toBe(true);
    await pager.loadMore();
    expect(get(pager).items).toHaveLength(100);
  });
});
