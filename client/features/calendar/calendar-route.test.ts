import { describe, expect, it } from "vitest";
import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
import { Product } from "@nucleum/client/config/product.type";
import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";
import {
  calendarViewSubPath,
  parseCalendarLayout,
  parseCalendarScale,
  resolveCalendarViewSegments
} from "./calendar-route";

describe("calendar route", () => {
  it("encodes layout and scale as lowercase slugs", () => {
    expect(
      calendarViewSubPath({
        layout: CalendarLayout.Classic,
        scale: TimeScaleUnit.YEAR
      })
    ).toEqual(["classic", "year"]);
    expect(
      calendarViewSubPath({
        layout: CalendarLayout.Bird,
        scale: TimeScaleUnit.WEEK
      })
    ).toEqual(["columns", "week"]);
  });

  it("accepts only layouts and scales the product renders", () => {
    expect(parseCalendarLayout("columns", Product.NUCLEUM, true)).toBe(
      CalendarLayout.Bird
    );
    expect(parseCalendarLayout("columns", Product.NUCLEUM, false)).toBe(
      undefined
    );
    expect(parseCalendarLayout("columns", Product.MEMOTRON, true)).toBe(
      undefined
    );
    expect(
      parseCalendarScale("day", Product.MEMOTRON, CalendarLayout.Classic, true)
    ).toBe(undefined);
    expect(
      parseCalendarScale("YEAR", Product.MEMOTRON, CalendarLayout.Classic, true)
    ).toBe(TimeScaleUnit.YEAR);
    expect(
      parseCalendarScale(
        "week",
        Product.POINTRON,
        CalendarLayout.Classic,
        false
      )
    ).toBe(undefined);
  });

  it("lists every rendered view for sub-view actions", () => {
    expect(
      resolveCalendarViewSegments(Product.MEMOTRON, false).map((segments) =>
        segments.map((segment) => segment.slug).join("/")
      )
    ).toEqual(["classic/month", "classic/year"]);
    expect(
      resolveCalendarViewSegments(Product.NUCLEUM, true).map((segments) =>
        segments.map((segment) => segment.slug).join("/")
      )
    ).toEqual([
      "columns/part",
      "columns/day",
      "columns/week",
      "columns/month",
      "columns/year",
      "classic/day",
      "classic/week",
      "classic/month",
      "classic/year",
      "classic/heatmap"
    ]);
  });
});
