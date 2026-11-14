import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";

const mocks = vi.hoisted(() => {
  const { readable, writable } =
    require("svelte/store") as typeof import("svelte/store");
  return {
    isHosted: readable(true),
    entryWidth: writable<number | undefined>(100),
    app: writable({ product: "nucleum" }),
    setState: vi.fn()
  };
});

vi.mock("@21n/ui/elements/markdown/markdown.utils", () => ({
  renderMdAsHtml: (value: string) => value
}));
vi.mock("@nucleum/shell/topNav/contextZone/context-zone", async (load) => ({
  ...(await load<
    typeof import("@nucleum/shell/topNav/contextZone/context-zone")
  >()),
  contextZone: { isHosted: mocks.isHosted, entryWidth: mocks.entryWidth }
}));
vi.mock(
  "@nucleum/shell/topNav/contextZone/ContextZoneContent.svelte",
  async () => ({
    default: (
      await import("../../../tests/fixtures/components/ContextZoneContentInlineStub.svelte")
    ).default
  })
);
vi.mock("@nucleum/shell/navigation/components/BackButton.svelte", async () => ({
  default: (await import("../../../tests/fixtures/components/EmptyStub.svelte"))
    .default
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: vi.fn() }
}));
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ runAction: vi.fn() })
}));
vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: mocks.app
}));
vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { setState: mocks.setState }
}));

import CalendarLayoutView from "@nucleum/features/calendar/CalendarLayout.svelte";
import {
  CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS,
  takeCalendarOverflowMenuReopen
} from "@nucleum/features/calendar/calendar-overflow-menu";

const CONTROLS_WIDTH: Partial<Record<CalendarLayout, number>> = {
  [CalendarLayout.Bird]: 400,
  [CalendarLayout.Classic]: 50
};

function overflowMenu() {
  return document.querySelector<HTMLElement>(
    "#popovers #calendarContextZoneMenu"
  );
}

function layoutOption(name: string) {
  const option = overflowMenu()?.querySelector<HTMLElement>(
    `[role="radio"][data-option-value="${name}"]`
  );
  if (!option) throw new Error(`Layout option ${name} is not shown`);
  return option;
}

async function openOverflowMenu() {
  const trigger = await waitFor(() => {
    const element = document.querySelector<HTMLElement>(
      '[data-testid="calendar-overflow-menu"]'
    );
    expect(element).toBeTruthy();
    return element!;
  });
  await fireEvent.click(trigger);
  await waitFor(() => expect(overflowMenu()).toBeTruthy());
}

/**
 * Renders the calendar as Calendar.svelte does: each layout mounts its own
 * CalendarLayout, so a layout pick unmounts the view and its open menu and
 * mounts the next one.
 */
function renderSwappingCalendar(initial: CalendarLayout, target?: HTMLElement) {
  let view = render(CalendarLayoutView, { target, props: { panel: initial } });
  let shown = initial;
  mocks.setState.mockImplementation((_key: unknown, layout: CalendarLayout) => {
    if (layout === shown) return;
    shown = layout;
    view.unmount();
    view = render(CalendarLayoutView, { target, props: { panel: layout } });
  });
}

/** Renders the swapping calendar inside an open shadow root. */
function renderSwappingCalendarInShadowRoot(initial: CalendarLayout) {
  const host = document.createElement("div");
  document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const target = document.createElement("div");
  shadow.append(target);
  renderSwappingCalendar(initial, target);
  return shadow;
}

function nextFrames() {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );
}

describe("CalendarLayout overflow menu layout pick", () => {
  let scrollWidth: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      }
    );
    scrollWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollWidth"
    );
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.dataset.testid !== "calendar-context-controls") return 0;
        const layout = (this.getRootNode() as ParentNode)
          .querySelector(
            "[data-testid='calendar-layout-bird'], [data-testid='calendar-layout-classic']"
          )
          ?.getAttribute("data-testid")
          ?.replace("calendar-layout-", "");
        const gaps =
          Math.max(0, this.children.length - 1) *
          (parseFloat(this.style.columnGap) || 0);
        return (CONTROLS_WIDTH[layout as CalendarLayout] ?? 400) + gaps;
      }
    });
    mocks.entryWidth.set(100);
    mocks.setState.mockReset();
    const popovers = document.createElement("div");
    popovers.id = "popovers";
    const secondary = document.createElement("div");
    secondary.id = "secondary-popovers";
    document.body.append(popovers, secondary);
  });

  afterEach(() => {
    CONTROLS_WIDTH[CalendarLayout.Bird] = 400;
    vi.restoreAllMocks();
    if (scrollWidth)
      Object.defineProperty(HTMLElement.prototype, "scrollWidth", scrollWidth);
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("swaps the layout and reopens the menu with focus on the new choice", async () => {
    CONTROLS_WIDTH[CalendarLayout.Classic] = 400;
    renderSwappingCalendar(CalendarLayout.Bird);
    await openOverflowMenu();
    expect(layoutOption(CalendarLayout.Bird).getAttribute("aria-checked")).toBe(
      "true"
    );

    await fireEvent.click(layoutOption(CalendarLayout.Classic));

    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="calendar-layout-classic"]')
      ).toBeTruthy()
    );
    expect(mocks.setState).toHaveBeenCalledWith(
      expect.anything(),
      CalendarLayout.Classic,
      expect.anything()
    );
    await waitFor(() =>
      expect(
        layoutOption(CalendarLayout.Classic).getAttribute("aria-checked")
      ).toBe("true")
    );
    expect(document.activeElement).toBe(layoutOption(CalendarLayout.Classic));

    await fireEvent.keyDown(layoutOption(CalendarLayout.Classic), {
      key: "ArrowLeft"
    });
    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="calendar-layout-bird"]')
      ).toBeTruthy()
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(layoutOption(CalendarLayout.Bird))
    );
    expect(layoutOption(CalendarLayout.Bird).getAttribute("aria-checked")).toBe(
      "true"
    );
  });

  it("keeps the menu open when the new layout fits inline, and never reopens it later", async () => {
    CONTROLS_WIDTH[CalendarLayout.Classic] = 50;
    renderSwappingCalendar(CalendarLayout.Bird);
    await openOverflowMenu();
    const columns = layoutOption(CalendarLayout.Bird);
    columns.focus();

    await fireEvent.keyDown(columns, { key: "ArrowRight" });

    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="calendar-layout-classic"]')
      ).toBeTruthy()
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(layoutOption(CalendarLayout.Classic))
    );
    expect(
      layoutOption(CalendarLayout.Classic).getAttribute("aria-checked")
    ).toBe("true");
    expect(
      document.querySelector('[data-testid="calendar-layout-switcher"]')
    ).toBeNull();

    await fireEvent.click(
      document.querySelector<HTMLElement>(
        '[data-testid="calendar-overflow-menu"]'
      )!
    );
    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="calendar-layout-switcher"]')
      ).toBeTruthy()
    );
    expect(overflowMenu()).toBeNull();

    mocks.entryWidth.set(10);
    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="calendar-overflow-menu"]')
      ).toBeTruthy()
    );
    await nextFrames();
    expect(overflowMenu()).toBeNull();
  });

  it("keeps the same trigger and returns focus to it when a compact layout's reopened menu closes", async () => {
    CONTROLS_WIDTH[CalendarLayout.Classic] = 400;
    renderSwappingCalendar(CalendarLayout.Bird);
    await openOverflowMenu();
    await fireEvent.click(layoutOption(CalendarLayout.Classic));
    await waitFor(() =>
      expect(document.activeElement).toBe(layoutOption(CalendarLayout.Classic))
    );
    const trigger = document.querySelector<HTMLElement>(
      '[data-testid="calendar-overflow-menu"]'
    );

    await fireEvent.click(
      overflowMenu()!.querySelector<HTMLElement>(
        '[data-context-menu-item-id="today"]'
      )!
    );

    await waitFor(() => expect(overflowMenu()).toBeNull());
    await nextFrames();
    expect(
      document.querySelector('[data-testid="calendar-overflow-menu"]')
    ).toBe(trigger);
    expect(document.activeElement).toBe(trigger);
  });

  it("moves focus to the inline layout switcher when the reopened menu closes and the layout fits", async () => {
    CONTROLS_WIDTH[CalendarLayout.Classic] = 50;
    renderSwappingCalendar(CalendarLayout.Bird);
    await openOverflowMenu();
    await fireEvent.click(layoutOption(CalendarLayout.Classic));
    await waitFor(() =>
      expect(document.activeElement).toBe(layoutOption(CalendarLayout.Classic))
    );

    await fireEvent.click(
      overflowMenu()!.querySelector<HTMLElement>(
        '[data-context-menu-item-id="today"]'
      )!
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector(
          '[data-testid="calendar-layout-switcher"] button[aria-label="Classic"]'
        )
      )
    );
    expect(document.activeElement).not.toBe(document.body);
    await nextFrames();
    expect(
      document.querySelector('[data-testid="calendar-overflow-menu"]')
    ).toBeNull();
  });
  /**
   * Holds every animation frame until `runFrames`, then runs them with the
   * clock at `at`, as a frame delayed by a busy or backgrounded page would.
   */
  function delayFrames(clock: { now: number }) {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(Date, "now").mockImplementation(() => clock.now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      frames[handle - 1] = () => {};
    });
    return (at: number) => {
      clock.now = at;
      for (const frame of frames.splice(0)) frame(at);
    };
  }

  async function pickClassicWithDelayedFrame(frameDelayMs: number) {
    CONTROLS_WIDTH[CalendarLayout.Classic] = 400;
    const clock = { now: 10_000 };
    renderSwappingCalendar(CalendarLayout.Bird);
    await openOverflowMenu();
    const runFrames = delayFrames(clock);

    await fireEvent.click(layoutOption(CalendarLayout.Classic));
    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="calendar-layout-classic"]')
      ).toBeTruthy()
    );
    await waitFor(() => expect(overflowMenu()).toBeNull());
    const triggerClick = vi.spyOn(
      document.querySelector<HTMLElement>(
        '[data-testid="calendar-overflow-menu"]'
      )!,
      "click"
    );
    runFrames(10_000 + frameDelayMs);
    return triggerClick;
  }

  it("does not reopen the menu from a frame that runs after the reopen window", async () => {
    const triggerClick = await pickClassicWithDelayedFrame(
      CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS + 1
    );

    expect(triggerClick).not.toHaveBeenCalled();
    await tick();
    expect(overflowMenu()).toBeNull();
    expect(document.activeElement).toBe(document.body);
    expect(takeCalendarOverflowMenuReopen(10_100)).toBe(false);

    mocks.entryWidth.set(90);
    await tick();
    expect(triggerClick).not.toHaveBeenCalled();
    expect(overflowMenu()).toBeNull();
  });

  it("still reopens the menu from a frame that runs exactly at the end of the window", async () => {
    const triggerClick = await pickClassicWithDelayedFrame(
      CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS
    );
    expect(triggerClick).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(document.activeElement).toBe(layoutOption(CalendarLayout.Classic))
    );
  });

  it("hands focus to the inline switcher inside a shadow root and keeps the compact trigger", async () => {
    CONTROLS_WIDTH[CalendarLayout.Classic] = 400;
    const shadow = renderSwappingCalendarInShadowRoot(CalendarLayout.Bird);
    const trigger = () =>
      shadow.querySelector<HTMLElement>('[data-testid="calendar-overflow-menu"]');
    const closeWithToday = () =>
      fireEvent.click(
        overflowMenu()!.querySelector<HTMLElement>(
          '[data-context-menu-item-id="today"]'
        )!
      );
    await waitFor(() => expect(trigger()).toBeTruthy());
    await fireEvent.click(trigger()!);
    await waitFor(() => expect(overflowMenu()).toBeTruthy());

    await fireEvent.click(layoutOption(CalendarLayout.Classic));
    await waitFor(() =>
      expect(document.activeElement).toBe(layoutOption(CalendarLayout.Classic))
    );
    const compactTrigger = trigger();
    await closeWithToday();
    await waitFor(() => expect(overflowMenu()).toBeNull());
    await nextFrames();
    expect(trigger()).toBe(compactTrigger);
    expect(shadow.activeElement).toBe(compactTrigger);

    CONTROLS_WIDTH[CalendarLayout.Bird] = 50;
    await fireEvent.click(compactTrigger!);
    await waitFor(() => expect(overflowMenu()).toBeTruthy());
    await fireEvent.click(layoutOption(CalendarLayout.Bird));
    await waitFor(() =>
      expect(document.activeElement).toBe(layoutOption(CalendarLayout.Bird))
    );
    await closeWithToday();

    await waitFor(() =>
      expect(shadow.activeElement).toBe(
        shadow.querySelector(
          '[data-testid="calendar-layout-switcher"] button[aria-label="Columns"]'
        )
      )
    );
    expect(trigger()).toBeNull();
  });

  it("leaves focus the user moved elsewhere inside a shadow root when the reopened menu closes", async () => {
    CONTROLS_WIDTH[CalendarLayout.Classic] = 50;
    const shadow = renderSwappingCalendarInShadowRoot(CalendarLayout.Bird);
    const outside = document.createElement("input");
    shadow.append(outside);
    const trigger = await waitFor(() => {
      const element = shadow.querySelector<HTMLElement>(
        '[data-testid="calendar-overflow-menu"]'
      );
      expect(element).toBeTruthy();
      return element!;
    });
    await fireEvent.click(trigger);
    await waitFor(() => expect(overflowMenu()).toBeTruthy());
    await fireEvent.click(layoutOption(CalendarLayout.Classic));
    await waitFor(() =>
      expect(document.activeElement).toBe(layoutOption(CalendarLayout.Classic))
    );

    outside.focus();
    await fireEvent.click(outside);

    await waitFor(() => expect(overflowMenu()).toBeNull());
    await nextFrames();
    expect(shadow.activeElement).toBe(outside);
  });
});
