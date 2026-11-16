import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const { query, mutate, recordMaintenanceRun } = vi.hoisted(() => ({
  query: vi.fn(),
  mutate: vi.fn(),
  recordMaintenanceRun: vi.fn()
}));

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { event: { query, mutate } },
  datafnRuntime: writable({ namespace: "ns" })
}));
vi.mock("@nucleum/datafn/maintenance-schedule", () => ({
  isMaintenanceDue: async () => true,
  recordMaintenanceRun
}));

const { repairLegacyEventTimesIfDue } = await import("./legacy-event-times");

describe("legacy event-time repair scans", () => {
  it("reaches events after many pages with nothing to lift", async () => {
    query.mockReset();
    mutate.mockReset();
    recordMaintenanceRun.mockReset();
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
    expect(recordMaintenanceRun).toHaveBeenCalledTimes(1);
  });
});

describe("legacy event-time repair failures", () => {
  it("doesn't record the run when a write is rejected", async () => {
    query.mockReset();
    mutate.mockReset();
    recordMaintenanceRun.mockReset();
    query.mockResolvedValue({
      data: [{ id: "event:a", value: { startUnix: 1, endUnix: 2 } }]
    });
    mutate.mockResolvedValue([{ ok: false }]);
    expect(await repairLegacyEventTimesIfDue()).toBe(0);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(recordMaintenanceRun).not.toHaveBeenCalled();
  });
});
