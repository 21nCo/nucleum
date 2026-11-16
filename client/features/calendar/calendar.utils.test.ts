import { describe, expect, it } from "vitest";
import {
  mergeCalendarEventResults,
  resolveCalendarEventOverlapFilters
} from "./calendar.utils";

describe("calendar event overlap filters", () => {
  it("uses separate top-level filters (servers reject $or and JSON-path keys)", () => {
    const filters = resolveCalendarEventOverlapFilters({
      start: 100,
      end: 200
    });
    expect(filters).toHaveLength(2);
    for (const clause of filters) {
      expect(Object.keys(clause).every((key) => !key.startsWith("$"))).toBe(
        true
      );
      expect(Object.keys(clause).every((key) => !key.includes("."))).toBe(true);
    }
  });
});

describe("mergeCalendarEventResults", () => {
  it("keeps each event once and orders by start time", () => {
    const merged = mergeCalendarEventResults([
      [
        { id: "b", startUnix: 30 },
        { id: "a", startUnix: 10 }
      ],
      [
        { id: "a", startUnix: 10 },
        { id: "c", startUnix: 20 }
      ],
      undefined
    ]);
    expect(merged.map((event) => event.id)).toEqual(["a", "c", "b"]);
  });
});
