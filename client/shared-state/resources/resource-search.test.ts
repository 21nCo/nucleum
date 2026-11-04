import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureProductConfigHost } from "@nucleum/shared-state/product/product-config-host";
import {
  RESOURCE_SEARCH_TIMEOUT_MS,
  ResourceSearchTimeoutError,
  rankResourceSearchMatches,
  searchResources,
  type ResourceSearchMatch
} from "./resource-search";

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  runtime: undefined as { mode: string } | undefined
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    datafn: { search: mocks.search },
    datafnRuntime: writable(mocks.runtime)
  };
});

function match(
  id: string,
  label: string,
  score: number,
  extra: Record<string, unknown> = {}
): ResourceSearchMatch {
  return {
    id,
    resource: id.split(":")[0],
    score,
    data: { id, label, ...extra }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  configureProductConfigHost({
    appMenu: [],
    appMenuPt: [],
    homePath: "/",
    homePathPt: "/",
    searchResources: ["node", "collection"]
  });
});

describe("resource search ranking", () => {
  it("ranks an exact label above a prefix and a contained match at equal index scores", () => {
    const ranked = rankResourceSearchMatches(
      [
        match("node:contains", "My plan notes", 1),
        match("node:prefix", "Plan for today", 1),
        match("node:exact", "Plan", 1)
      ],
      "plan"
    );
    expect(ranked.map((hit) => hit.id)).toEqual([
      "node:exact",
      "node:prefix",
      "node:contains"
    ]);
  });

  it("adds the boost so frequently opened records rise", () => {
    const matches = [
      match("node:a", "Plan alpha", 1),
      match("node:b", "Plan beta", 1)
    ];
    expect(rankResourceSearchMatches(matches, "plan")[0].id).toBe("node:a");
    const boosted = rankResourceSearchMatches(matches, "plan", (id) =>
      id === "node:b" ? 1 : 0
    );
    expect(boosted[0].id).toBe("node:b");
    expect(boosted[0].score).toBeGreaterThan(boosted[0].relevance);
  });

  it("drops trashed, archived, duplicate and non-record matches", () => {
    const ranked = rankResourceSearchMatches(
      [
        match("node:kept", "Kept", 1),
        match("node:kept", "Kept", 1),
        match("node:trashed", "Trashed", 1, { trashedAt: "2026-01-01" }),
        match("node:archived", "Archived", 1, { isArchived: true }),
        match("plain", "Plain", 1)
      ],
      "k"
    );
    expect(ranked.map((hit) => hit.id)).toEqual(["node:kept"]);
  });
});

describe("searchResources", () => {
  it("searches the configured resources and limits the ranked hits", async () => {
    mocks.search.mockResolvedValue({
      results: [match("node:a", "Alpha", 2), match("collection:b", "Alp", 2)]
    });
    const hits = await searchResources({ query: " alp ", limit: 1 });
    expect(mocks.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "alp",
        resources: ["node", "collection"],
        source: "local"
      })
    );
    expect(hits.map((hit) => hit.id)).toEqual(["collection:b"]);
  });

  it("resolves to no hits for an empty query without searching", async () => {
    expect(await searchResources({ query: "  " })).toEqual([]);
    expect(mocks.search).not.toHaveBeenCalled();
  });

  describe("when the request does not settle", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("fails with a timeout and aborts the DataFn request", async () => {
      vi.useFakeTimers();
      let requestSignal: AbortSignal | undefined;
      mocks.search.mockImplementation((params: { signal?: AbortSignal }) => {
        requestSignal = params.signal;
        return new Promise(() => {});
      });
      const pending = searchResources({ query: "alp" });
      const assertion = expect(pending).rejects.toBeInstanceOf(
        ResourceSearchTimeoutError
      );
      await vi.advanceTimersByTimeAsync(RESOURCE_SEARCH_TIMEOUT_MS);
      await assertion;
      expect(requestSignal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("rejects and aborts the DataFn request when the caller aborts", async () => {
      vi.useFakeTimers();
      let requestSignal: AbortSignal | undefined;
      mocks.search.mockImplementation((params: { signal?: AbortSignal }) => {
        requestSignal = params.signal;
        return new Promise(() => {});
      });
      const controller = new AbortController();
      const pending = searchResources({
        query: "alp",
        signal: controller.signal
      });
      const assertion = expect(pending).rejects.toBeDefined();
      await vi.advanceTimersByTimeAsync(0);
      controller.abort();
      await assertion;
      expect(requestSignal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it("rejects an already aborted search without starting a DataFn request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      searchResources({ query: "plan", signal: controller.signal })
    ).rejects.toBeDefined();
    expect(mocks.search).not.toHaveBeenCalled();
  });
});
