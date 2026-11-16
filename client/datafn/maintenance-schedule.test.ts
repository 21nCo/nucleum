import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock("@nucleum/persistence/client-storage", () => ({
  clientStorage: {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => {
      store.set(key, value);
    }
  }
}));

const { isMaintenanceDue, recordMaintenanceRun } =
  await import("./maintenance-schedule");

const key = ClientStorageKey.MARKDOWN_PARENT_REPAIR_AT;
const day = 24 * 60 * 60 * 1000;

describe("maintenance schedule", () => {
  beforeEach(() => store.clear());

  it("is due until a run is recorded, then again after the interval", async () => {
    expect(
      await isMaintenanceDue({ key, namespace: "a", intervalMs: day, now: 0 })
    ).toBe(true);
    expect(
      await isMaintenanceDue({ key, namespace: "a", intervalMs: day, now: 10 })
    ).toBe(true);
    await recordMaintenanceRun({ key, namespace: "a", now: 10 });
    expect(
      await isMaintenanceDue({ key, namespace: "a", intervalMs: day, now: 20 })
    ).toBe(false);
    expect(
      await isMaintenanceDue({
        key,
        namespace: "a",
        intervalMs: day,
        now: 10 + day
      })
    ).toBe(true);
  });

  it("keeps namespaces apart and tolerates unreadable stored values", async () => {
    await recordMaintenanceRun({ key, namespace: "a", now: 0 });
    expect(
      await isMaintenanceDue({ key, namespace: "b", intervalMs: day, now: 1 })
    ).toBe(true);
    store.set(key, "not json");
    expect(
      await isMaintenanceDue({ key, namespace: "a", intervalMs: day, now: 1 })
    ).toBe(true);
  });
});
