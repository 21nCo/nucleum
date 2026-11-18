import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
import CalendarHeader from "@nucleum/features/calendar/classic/CalendarHeader.svelte";

describe("CalendarHeader with the date hidden", () => {
  const date = new Date(2026, 10, 18);

  it("shows only the previous and next buttons", () => {
    const { container, getByRole } = render(CalendarHeader, {
      props: {
        selectedDate: date,
        selectedView: TimeScaleUnit.YEAR,
        isShortDate: true,
        isDateHidden: true
      }
    });

    expect(container.querySelector("h2")).toBeNull();
    expect(
      getByRole("button", { name: "Previous calendar period" })
    ).toBeTruthy();
    expect(getByRole("button", { name: "Next calendar period" })).toBeTruthy();
  });

  it("shows the date between the buttons otherwise", () => {
    const { container, getByRole } = render(CalendarHeader, {
      props: {
        selectedDate: date,
        selectedView: TimeScaleUnit.MONTH,
        isShortDate: true
      }
    });

    expect(container.querySelector("h2")?.textContent?.trim()).toBe("Nov 2026");
    expect(getByRole("button", { name: "Next calendar period" })).toBeTruthy();
  });
});
