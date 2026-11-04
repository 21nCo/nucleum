import { describe, expect, it } from "vitest";
import { msUntilNextDay } from "@nucleum/features/focus/quickstart/quick-focus";

describe("msUntilNextDay", () => {
  it("counts down to the next local midnight", () => {
    const now = new Date(2026, 10, 4, 23, 59, 30);
    expect(msUntilNextDay(now)).toBe(30_000);
  });

  it("returns a full day at local midnight", () => {
    const now = new Date(2026, 10, 4, 0, 0, 0);
    const next = new Date(2026, 10, 5, 0, 0, 0);
    expect(msUntilNextDay(now)).toBe(next.getTime() - now.getTime());
  });
});
