import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const { query, mutate, storage } = vi.hoisted(() => ({
  query: vi.fn(),
  mutate: vi.fn(),
  storage: new Map<string, string>()
}));

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { event: { query, mutate } },
  datafnRuntime: writable({ namespace: "ns" })
}));
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
    const pageSize = 200;
    query.mockImplementation(async (input: any) =>
      "startUnix" in input.filters
        ? {
            data: Array.from({ length: pageSize }, (_, index) => ({
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
});
