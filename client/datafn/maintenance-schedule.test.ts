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

const {
  assertMaintenanceWritesSucceeded,
  isMaintenanceDue,
  recordMaintenanceRun,
  runMaintenanceIfDue
} = await import("./maintenance-schedule");

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

  it("fails a run when any write in an outcome was rejected", () => {
    expect(() =>
      assertMaintenanceWritesSucceeded([{ ok: true }, { ok: false }], "task")
    ).toThrow("task: a write was rejected");
    expect(() =>
      assertMaintenanceWritesSucceeded({ ok: false }, "task")
    ).toThrow();
    expect(() =>
      assertMaintenanceWritesSucceeded([{ ok: true }], "task")
    ).not.toThrow();
    expect(() =>
      assertMaintenanceWritesSucceeded(undefined, "task")
    ).not.toThrow();
  });

  it("records a run only when the task succeeds", async () => {
    const params = {
      key,
      namespace: "a",
      currentNamespace: () => "a",
      intervalMs: day,
      task: "t",
      fallback: -1
    };
    expect(
      await runMaintenanceIfDue({
        ...params,
        now: 0,
        run: async () => {
          throw new Error("not ready");
        }
      })
    ).toBe(-1);
    expect(
      await isMaintenanceDue({ key, namespace: "a", intervalMs: day, now: 1 })
    ).toBe(true);
    expect(
      await runMaintenanceIfDue({ ...params, now: 2, run: async () => 5 })
    ).toBe(5);
    expect(
      await runMaintenanceIfDue({ ...params, now: 3, run: async () => 6 })
    ).toBe(-1);
  });

  it("fails and doesn't record a run when the namespace changes during it", async () => {
    let current = "a";
    const writes: string[] = [];
    const params = {
      key,
      namespace: "a",
      currentNamespace: () => current,
      intervalMs: day,
      task: "t",
      fallback: -1,
      now: 0
    };
    expect(
      await runMaintenanceIfDue({
        ...params,
        run: async (assertCurrent) => {
          assertCurrent();
          writes.push("first");
          current = "b";
          assertCurrent();
          writes.push("second");
          return 1;
        }
      })
    ).toBe(-1);
    expect(writes).toEqual(["first"]);
    expect(
      await isMaintenanceDue({ key, namespace: "a", intervalMs: day, now: 1 })
    ).toBe(true);
    current = "a";
    expect(
      await runMaintenanceIfDue({
        ...params,
        run: async () => {
          current = "b";
          return 1;
        }
      })
    ).toBe(-1);
    expect(
      await isMaintenanceDue({ key, namespace: "a", intervalMs: day, now: 1 })
    ).toBe(true);
  });
});
