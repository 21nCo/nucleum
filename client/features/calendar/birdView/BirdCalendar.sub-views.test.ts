import { fireEvent, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
import {
  BASE_CONTEXT_ZONE_PANE,
  contextZone,
  type ContextZoneSubViewRegistration
} from "@nucleum/shell/topNav/contextZone/context-zone";

vi.mock("@nucleum/features/calendar/CalendarLayout.svelte", async () => ({
  default: (
    await import("../../../../tests/fixtures/components/CalendarLayoutHeaderLeftStub.svelte")
  ).default
}));
vi.mock("@nucleum/features/calendar/birdView/Birdview.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/calendar/classic/CalendarHeader.svelte", () => ({
  default: () => {}
}));

import BirdCalendar from "@nucleum/features/calendar/birdView/BirdCalendar.svelte";

let competitor: ContextZoneSubViewRegistration | undefined;
let view: ReturnType<typeof render> | undefined;
const competitorSelect = vi.fn();

function registerCompetitor() {
  competitor = contextZone.registerSubViews(BASE_CONTEXT_ZONE_PANE, {
    views: { values: ["a", "b"], active: "a", select: competitorSelect }
  });
}

function scaleOption(scale: TimeScaleUnit) {
  const option = document.querySelector<HTMLElement>(
    `[data-option-value="${scale}"]`
  );
  if (!option) throw new Error(`Scale option ${scale} is not shown`);
  return option;
}

beforeEach(() => {
  competitorSelect.mockClear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  competitor?.release();
  competitor = undefined;
  view?.unmount();
  view = undefined;
});

describe("BirdCalendar scale sub switcher", () => {
  it("leaves the keys on the newest switcher until the scale is picked", async () => {
    view = render(BirdCalendar, { props: { scale: TimeScaleUnit.DAY } });
    await tick();
    registerCompetitor();

    expect(contextZone.stepSub(1)).toBe(true);
    expect(competitorSelect).toHaveBeenCalledWith("b");
  });

  it("follows the scale switcher after the active scale is picked again", async () => {
    view = render(BirdCalendar, { props: { scale: TimeScaleUnit.DAY } });
    await tick();
    registerCompetitor();

    await fireEvent.click(scaleOption(TimeScaleUnit.DAY));

    expect(contextZone.stepSub(1)).toBe(true);
    expect(competitorSelect).not.toHaveBeenCalled();
    expect(contextZone.resolveSubViews()?.active).toBe(TimeScaleUnit.WEEK);
  });

  it("follows the scale switcher after another scale is picked", async () => {
    view = render(BirdCalendar, { props: { scale: TimeScaleUnit.DAY } });
    await tick();
    registerCompetitor();

    await fireEvent.click(scaleOption(TimeScaleUnit.MONTH));

    expect(contextZone.stepSub(-1)).toBe(true);
    expect(competitorSelect).not.toHaveBeenCalled();
    expect(contextZone.resolveSubViews()?.active).toBe(TimeScaleUnit.WEEK);
  });

  it("does not take the keys when the scale changes without a pick", async () => {
    view = render(BirdCalendar, { props: { scale: TimeScaleUnit.DAY } });
    await tick();
    registerCompetitor();

    await view.rerender({ scale: TimeScaleUnit.WEEK });
    await tick();

    expect(contextZone.stepSub(1)).toBe(true);
    expect(competitorSelect).toHaveBeenCalledWith("b");
  });
});
