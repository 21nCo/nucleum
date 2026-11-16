import { describe, expect, it } from "vitest";
import { resolveCalendarEventOverlapFilters } from "./calendar.utils";

describe("calendar event overlap filter", () => {
  it("filters only top-level fields (servers reject JSON-path keys)", () => {
    const filters = resolveCalendarEventOverlapFilters({
      start: 100,
      end: 200
    });
    const keys = filters.$or.flatMap((clause) => Object.keys(clause));
    expect(keys.every((key) => !key.includes("."))).toBe(true);
    expect(filters.$or).toHaveLength(2);
  });
});
