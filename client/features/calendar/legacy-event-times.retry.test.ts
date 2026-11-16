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

describe("legacy event-time repair failures", () => {
  it("doesn't record the run when a write is rejected", async () => {
    query.mockResolvedValue({
      data: [{ id: "event:a", value: { startUnix: 1, endUnix: 2 } }]
    });
    mutate.mockResolvedValue([{ ok: false }]);
    expect(await repairLegacyEventTimesIfDue()).toBe(0);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(recordMaintenanceRun).not.toHaveBeenCalled();
  });
});
