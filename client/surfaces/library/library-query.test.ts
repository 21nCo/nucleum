import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    datafn: { table: () => ({ query }) },
    datafnRuntime: writable(null)
  };
});

import { createLibraryQuery } from "./library-query";
import { Resource } from "@nucleum/datafn/resource.enum";

function libraryQuery(isArchivedFilterSelected: boolean) {
  return createLibraryQuery({
    resource: Resource.task,
    signalResource: undefined,
    selectedSubType: "all" as any,
    isArchivedFilterSelected,
    isStarFilterSelected: false,
    isConstrainedWidth: false,
    searchQuery: ""
  });
}

describe("library record counts", () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ data: [{ id: "task:1" }], count: 42 });
  });

  it("asks DataFn for a count instead of every row", async () => {
    const count = await libraryQuery(false).queryLibraryRecordCount({
      filters: {}
    });
    expect(count).toBe(42);
    const input = query.mock.calls[0][0];
    expect(input.count).toBe(true);
    expect(input.limit).toBe(1);
    expect(input.select).toEqual(["id"]);
    expect(input.metadata).toBeUndefined();
  });

  it("counts only archived records in the archived view", async () => {
    await libraryQuery(true).queryLibraryRecordCount({ filters: {} });
    const input = query.mock.calls[0][0];
    expect(input.filters).toMatchObject({ isArchived: true });
    expect(input.metadata).toEqual({ includeArchived: true });
  });
});
