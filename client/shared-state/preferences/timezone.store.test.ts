import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { subscribe: () => () => {}, temporal: {} },
  datafnRuntime: { subscribe: () => () => {} }
}));

const { isTimezoneChangeEvent } = await import("./timezone.store");

describe("isTimezoneChangeEvent", () => {
  it("ignores writes to other resources", () => {
    expect(
      isTimezoneChangeEvent({ type: "mutation_applied", resource: "node" })
    ).toBe(false);
  });

  it("re-reads after a timezone change write", () => {
    expect(
      isTimezoneChangeEvent({
        type: "mutation_applied",
        resource: "datafnTimezoneChange"
      })
    ).toBe(true);
  });

  it("re-reads after a sync that brought timezone changes or names nothing", () => {
    expect(
      isTimezoneChangeEvent({
        type: "sync_applied",
        context: { resources: ["datafnTimezoneChange"] }
      })
    ).toBe(true);
    expect(
      isTimezoneChangeEvent({
        type: "sync_applied",
        context: { resources: ["node"] }
      })
    ).toBe(false);
    expect(isTimezoneChangeEvent({ type: "sync_applied" })).toBe(true);
  });
});
