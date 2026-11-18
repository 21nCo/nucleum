import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const { query, mutate, storage } = vi.hoisted(() => ({
  query: vi.fn(),
  mutate: vi.fn(),
  storage: new Map<string, string>()
}));

const runtime = vi.hoisted(() => ({ store: undefined as any }));

vi.mock("@nucleum/datafn/datafn.store", () => {
  runtime.store = writable({ namespace: "ns" });
  return {
    datafn: { event: { query, mutate } },
    datafnRuntime: runtime.store
  };
});
vi.mock("@nucleum/persistence/client-storage", () => ({
  clientStorage: {
    get: async (key: string) => storage.get(key) ?? null,
    set: async (key: string, value: string) => {
      storage.set(key, value);
    }
  }
}));

/** Whether the repair's run was recorded for the test namespace. */
function isRunRecorded() {
  return [...storage.values()].some((value) => value.includes('"ns"'));
}

const { repairLegacyEventTimesIfDue } = await import("./legacy-event-times");

describe("legacy event-time repair scans", () => {
  it("reaches events after many pages with nothing to lift", async () => {
    query.mockReset();
    mutate.mockReset();
    storage.clear();
    const openEnded = Array.from({ length: 12_000 }, (_, index) => ({
      id: `event:${String(index).padStart(6, "0")}`,
      startUnix: 1
    }));
    const target = { id: "event:zzz", startUnix: 1, value: { endUnix: 9 } };
    query.mockImplementation(async (input: any) => {
      if ("startUnix" in input.filters) return { data: [] };
      const rows = [...openEnded, target];
      return {
        data: rows.slice(input.offset, input.offset + input.limit)
      };
    });
    mutate.mockResolvedValue([{ ok: true }]);
    expect(await repairLegacyEventTimesIfDue()).toBe(1);
    expect(mutate.mock.calls[0][0][0].id).toBe("event:zzz");
    expect(isRunRecorded()).toBe(true);
  });
});

describe("legacy event-time repair failures", () => {
  it("fails instead of looping when a written event comes back unchanged", async () => {
    query.mockReset();
    mutate.mockReset();
    storage.clear();
    mutate.mockResolvedValue([{ ok: true }]);
    query.mockImplementation(async (input: any) =>
      "startUnix" in input.filters
        ? {
            data: Array.from({ length: input.limit }, (_, index) => ({
              id: `event:${index}`,
              value: { startUnix: 1 }
            }))
          }
        : { data: [] }
    );
    expect(await repairLegacyEventTimesIfDue()).toBe(0);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(isRunRecorded()).toBe(false);
  });

  it("doesn't record the run when a write is rejected", async () => {
    query.mockReset();
    mutate.mockReset();
    storage.clear();
    query.mockResolvedValue({
      data: [{ id: "event:a", value: { startUnix: 1, endUnix: 2 } }]
    });
    mutate.mockResolvedValue([{ ok: false }]);
    expect(await repairLegacyEventTimesIfDue()).toBe(0);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(isRunRecorded()).toBe(false);
  });

  it("asks for pages within the account service's query limit", async () => {
    query.mockReset();
    mutate.mockReset();
    storage.clear();
    query.mockResolvedValue({ data: [] });
    await repairLegacyEventTimesIfDue();
    expect(query).toHaveBeenCalled();
    for (const [input] of query.mock.calls) {
      expect(input.limit).toBeLessThanOrEqual(100);
    }
  });

  it("stops without writing when DataFn moves to another namespace", async () => {
    query.mockReset();
    mutate.mockReset();
    storage.clear();
    query.mockImplementation(async () => {
      runtime.store.set({ namespace: "other" });
      return { data: [{ id: "event:a", value: { startUnix: 1 } }] };
    });
    try {
      expect(await repairLegacyEventTimesIfDue()).toBe(0);
      expect(mutate).not.toHaveBeenCalled();
      expect(isRunRecorded()).toBe(false);
    } finally {
      runtime.store.set({ namespace: "ns" });
    }
  });
});
