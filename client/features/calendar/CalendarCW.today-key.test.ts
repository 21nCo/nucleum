import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dates: [] as Date[],
  onDateChange: undefined as ((event: { detail?: Date }) => void) | undefined
}));

vi.mock("@nucleum/features/calendar/column/CalendarColumn.svelte", () => ({
  default: (
    _anchor: unknown,
    props: { date: Date; onDateChange: (event: { detail?: Date }) => void }
  ) => {
    mocks.dates.push(props.date);
    mocks.onDateChange = props.onDateChange;
  }
}));

import CalendarCW from "./CalendarCW.svelte";

async function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init
  });
  document.body.dispatchEvent(event);
  await tick();
  return event;
}

const isToday = (date: Date) =>
  date.toDateString() === new Date().toDateString();

describe("constrained-width calendar keys", () => {
  let unmount: () => void = () => undefined;

  beforeEach(() => {
    document.body.innerHTML = "";
    mocks.dates = [];
    unmount = render(CalendarCW).unmount;
  });

  afterEach(() => unmount());

  it("goes back to today on Shift+T after moving to another day", async () => {
    mocks.onDateChange?.({ detail: new Date(2020, 0, 15) });
    await tick();
    expect(mocks.dates.at(-1)?.getFullYear()).toBe(2020);

    const event = await press("T", { shiftKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(isToday(mocks.dates.at(-1)!)).toBe(true);
  });

  it("leaves T without Shift and Shift+T typed into a field alone", async () => {
    mocks.onDateChange?.({ detail: new Date(2020, 0, 15) });
    await tick();
    const shown = mocks.dates.length;

    await press("t");
    const input = document.createElement("input");
    document.body.append(input);
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "T",
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    await tick();
    expect(mocks.dates.length).toBe(shown);
  });
});
