import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";

const mocks = vi.hoisted(() => {
  const { readable, writable } =
    require("svelte/store") as typeof import("svelte/store");
  return {
    isHosted: readable(true),
    entryWidth: writable<number | undefined>(100),
    app: writable({ product: "nucleum" })
  };
});

vi.mock("@21n/ui/elements/markdown/markdown.utils", () => ({
  renderMdAsHtml: (value: string) => value
}));
vi.mock("@nucleum/shell/topNav/contextZone/context-zone", async (load) => {
  const actual =
    await load<
      typeof import("@nucleum/shell/topNav/contextZone/context-zone")
    >();
  return {
    ...actual,
    contextZone: {
      ...actual.contextZone,
      isHosted: mocks.isHosted,
      entryWidth: mocks.entryWidth
    }
  };
});
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
  uiState: { setState: vi.fn() }
}));

import CalendarLayoutView from "@nucleum/features/calendar/CalendarLayout.svelte";
import { requestCalendarOverflowMenuReopen } from "@nucleum/features/calendar/calendar-overflow-menu";

function overflowTrigger() {
  return document.querySelector<HTMLElement>(
    '[data-testid="calendar-overflow-menu"]'
  )!;
}

function openMenu() {
  return document.querySelector("#popovers #calendarContextZoneMenu");
}

function controlsLevel() {
  return document
    .querySelector<HTMLElement>('[data-testid="calendar-context-controls"]')
    ?.getAttribute("data-level");
}

/**
 * Gives each control group a fixed width, and the controls the width of the
 * groups they show, as a browser lays them out. The compact scale (150) is
 * narrower than the full one (200), so level 3 fits a 330px budget
 * (150 + 100 + 40 + two 12px gaps = 314) only with the compact width.
 */
function mockGroupWidths(onFullWidthRead: (groups: string[]) => void) {
  const groups: Record<string, number> = {
    layout: 100,
    "scale-full": 200,
    scale: 150,
    date: 200,
    "date-short": 100,
    trailing: 100,
    right: 40
  };
  const groupWidth = (element: Element) =>
    groups[(element as HTMLElement).dataset.calendarGroup ?? ""] ?? 0;
  const boundingRect = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const width = groupWidth(this);
    return {
      width,
      height: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect;
  };
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get(this: HTMLElement) {
      if (this.dataset.testid !== "calendar-context-controls") return 0;
      const children = Array.from(this.children);
      onFullWidthRead(
        children.map((child) => (child as HTMLElement).dataset.calendarGroup!)
      );
      return (
        children.reduce((sum, child) => sum + groupWidth(child), 0) +
        12 * Math.max(0, children.length - 1)
      );
    }
  });
  return {
    groups,
    restore: () => {
      HTMLElement.prototype.getBoundingClientRect = boundingRect;
    }
  };
}

async function settle() {
  for (let index = 0; index < 10; index += 1) await tick();
}

describe("CalendarLayout full controls after their content changes", () => {
  let scrollWidth: PropertyDescriptor | undefined;
  let fullWidth = 400;
  let fullWidthReads = 0;

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
    fullWidth = 400;
    fullWidthReads = 0;
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.dataset.testid !== "calendar-context-controls") return 0;
        fullWidthReads += 1;
        return fullWidth;
      }
    });
    mocks.entryWidth.set(300);
    const popovers = document.createElement("div");
    popovers.id = "popovers";
    const secondary = document.createElement("div");
    secondary.id = "secondary-popovers";
    document.body.append(popovers, secondary);
  });

  afterEach(() => {
    if (scrollWidth)
      Object.defineProperty(HTMLElement.prototype, "scrollWidth", scrollWidth);
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("returns to the full controls when shorter content fits after compaction", async () => {
    const { rerender } = render(CalendarLayoutView, {
      props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
    });
    await waitFor(() => expect(controlsLevel()).toBe("4"));

    fullWidth = 250;
    await rerender({ contentKey: "DAY|Nov 8" });

    await waitFor(() => expect(controlsLevel()).toBe("0"));
    const reads = fullWidthReads;
    await settle();
    expect(controlsLevel()).toBe("0");
    expect(fullWidthReads - reads).toBeLessThanOrEqual(2);
  });

  it("measures once more and stays compact when the new content still does not fit", async () => {
    const { rerender } = render(CalendarLayoutView, {
      props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
    });
    await waitFor(() => expect(controlsLevel()).toBe("4"));
    const readsBefore = fullWidthReads;

    fullWidth = 350;
    await rerender({ contentKey: "WEEK|Nov 15" });
    await settle();

    expect(controlsLevel()).toBe("4");
    expect(fullWidthReads).toBeGreaterThan(readsBefore);
    const reads = fullWidthReads;
    await settle();
    expect(fullWidthReads).toBe(reads);
  });

  it("keeps the compact controls while the content stays the same", async () => {
    const { rerender } = render(CalendarLayoutView, {
      props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
    });
    await waitFor(() => expect(controlsLevel()).toBe("4"));
    const reads = fullWidthReads;

    fullWidth = 250;
    await rerender({ contentKey: "WEEK|Nov 8" });
    await settle();

    expect(controlsLevel()).toBe("4");
    expect(fullWidthReads).toBe(reads);
  });

  it("keeps the open overflow menu while its content changes and measures once it closes", async () => {
    const { rerender } = render(CalendarLayoutView, {
      props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
    });
    await waitFor(() => expect(controlsLevel()).toBe("4"));
    await fireEvent.click(overflowTrigger());
    await waitFor(() => expect(openMenu()).toBeTruthy());
    const trigger = overflowTrigger();

    fullWidth = 250;
    await rerender({ contentKey: "DAY|Nov 8" });
    await settle();
    expect(controlsLevel()).toBe("4");
    expect(openMenu()).toBeTruthy();
    expect(overflowTrigger()).toBe(trigger);

    await fireEvent.click(trigger);
    await waitFor(() => expect(openMenu()).toBeNull());
    await waitFor(() => expect(controlsLevel()).toBe("0"));
  });

  it("waits for focus to leave the controls before showing the full controls", async () => {
    const { rerender } = render(CalendarLayoutView, {
      props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
    });
    await waitFor(() => expect(controlsLevel()).toBe("4"));
    const trigger = overflowTrigger();
    trigger.focus();

    fullWidth = 250;
    await rerender({ contentKey: "WEEK|Nov 15" });
    await settle();
    expect(controlsLevel()).toBe("4");
    expect(document.activeElement).toBe(trigger);

    trigger.blur();
    await waitFor(() => expect(controlsLevel()).toBe("0"));
  });

  it("restores the inline scale once a shorter scale label fits, even when the full controls do not", async () => {
    const groups: Record<string, number> = {
      layout: 100,
      "scale-full": 200,
      scale: 150,
      date: 200,
      "date-short": 100,
      right: 40
    };
    const boundingRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const width = groups[this.dataset.calendarGroup ?? ""] ?? 0;
      return {
        width,
        height: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({})
      } as DOMRect;
    };
    try {
      fullWidth = 600;
      mocks.entryWidth.set(450);
      const { rerender } = render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
      });
      await waitFor(() => expect(controlsLevel()).toBe("2"));
      mocks.entryWidth.set(300);
      await waitFor(() => expect(controlsLevel()).toBe("4"));

      groups["scale-full"] = 130;
      groups.scale = 80;
      await rerender({ contentKey: "DAY|Nov 8" });

      await waitFor(() => expect(controlsLevel()).toBe("3"));
      await settle();
      expect(controlsLevel()).toBe("3");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = boundingRect;
    }
  });
  describe("with a compact scale narrower than the full one", () => {
    let widths: ReturnType<typeof mockGroupWidths>;
    let readGroups: string[][];

    beforeEach(() => {
      readGroups = [];
      widths = mockGroupWidths((groups) => {
        fullWidthReads += 1;
        readGroups.push(groups);
      });
      mocks.entryWidth.set(330);
    });

    afterEach(() => widths.restore());

    it("measures the compact scale again after a content change and shows level 3 where it fits", async () => {
      widths.groups.scale = 170;
      const { rerender } = render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
      });
      await waitFor(() => expect(controlsLevel()).toBe("4"));
      await settle();
      expect(controlsLevel()).toBe("4");

      widths.groups.scale = 150;
      const reads = fullWidthReads;
      await rerender({ contentKey: "DAY|Nov 8" });

      await waitFor(() => expect(controlsLevel()).toBe("3"));
      expect(fullWidthReads).toBeGreaterThan(reads);
      const settledReads = fullWidthReads;
      await settle();
      expect(controlsLevel()).toBe("3");
      expect(fullWidthReads).toBe(settledReads);
    });

    it("measures the full controls in their own layout after a content change", async () => {
      mocks.entryWidth.set(450);
      const { rerender } = render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
      });
      await waitFor(() => expect(controlsLevel()).toBe("2"));
      await settle();
      readGroups = [];

      await rerender({ contentKey: "WEEK|Nov 15" });
      await settle();

      expect(readGroups.length).toBeGreaterThan(0);
      for (const groups of readGroups)
        expect(groups).toEqual(["layout", "scale-full", "date", "trailing"]);
      expect(controlsLevel()).toBe("2");
    });

    it("measures the compact scale once and stays at level 4 when level 3 still does not fit", async () => {
      mocks.entryWidth.set(300);
      render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
      });
      await waitFor(() => expect(controlsLevel()).toBe("4"));
      await settle();

      expect(controlsLevel()).toBe("4");
      expect(
        document.querySelector('[data-calendar-group="scale-menu"]')
      ).toBeTruthy();
    });

    it("waits for the open overflow menu to close before measuring the changed content", async () => {
      widths.groups.scale = 170;
      const { rerender } = render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
      });
      await waitFor(() => expect(controlsLevel()).toBe("4"));
      await fireEvent.click(overflowTrigger());
      await waitFor(() => expect(openMenu()).toBeTruthy());
      const trigger = overflowTrigger();
      const reads = fullWidthReads;

      widths.groups.scale = 150;
      await rerender({ contentKey: "DAY|Nov 8" });
      await settle();
      expect(controlsLevel()).toBe("4");
      expect(openMenu()).toBeTruthy();
      expect(overflowTrigger()).toBe(trigger);
      expect(fullWidthReads).toBe(reads);

      await fireEvent.click(trigger);
      await waitFor(() => expect(openMenu()).toBeNull());
      await waitFor(() => expect(controlsLevel()).toBe("3"));
      expect(fullWidthReads).toBeGreaterThan(reads);
    });

    it("waits for focus to leave the controls before measuring the changed content", async () => {
      widths.groups.scale = 170;
      const { rerender } = render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
      });
      await waitFor(() => expect(controlsLevel()).toBe("4"));
      const trigger = overflowTrigger();
      trigger.focus();
      const reads = fullWidthReads;

      widths.groups.scale = 150;
      await rerender({ contentKey: "WEEK|Nov 15" });
      await settle();
      expect(controlsLevel()).toBe("4");
      expect(document.activeElement).toBe(trigger);
      expect(fullWidthReads).toBe(reads);

      trigger.blur();
      await waitFor(() => expect(controlsLevel()).toBe("3"));
      expect(fullWidthReads).toBeGreaterThan(reads);
    });

    it("holds the reopened menu through a content change and measures once it closes", async () => {
      widths.groups.scale = 170;
      requestCalendarOverflowMenuReopen();
      const { rerender } = render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "WEEK|Nov 8" }
      });
      await waitFor(() => expect(openMenu()).toBeTruthy());
      expect(controlsLevel()).toBe("4");
      const trigger = overflowTrigger();
      const reads = fullWidthReads;

      widths.groups.scale = 150;
      await rerender({ contentKey: "DAY|Nov 8" });
      await settle();
      expect(controlsLevel()).toBe("4");
      expect(openMenu()).toBeTruthy();
      expect(overflowTrigger()).toBe(trigger);
      expect(fullWidthReads).toBe(reads);

      await fireEvent.click(trigger);
      await waitFor(() => expect(openMenu()).toBeNull());
      await settle();
      expect(document.activeElement).toBe(trigger);
      expect(controlsLevel()).toBe("4");
      expect(fullWidthReads).toBe(reads);

      trigger.blur();
      await waitFor(() => expect(controlsLevel()).toBe("3"));
      expect(fullWidthReads).toBeGreaterThan(reads);
    });
  });
  describe("at a top bar too narrow for the scale-in-menu controls", () => {
    let widths: ReturnType<typeof mockGroupWidths>;
    const dateGroup = () =>
      document
        .querySelector<HTMLElement>(
          '[data-testid="calendar-context-controls"] > [data-calendar-group^="date"]'
        )
        ?.getAttribute("data-calendar-group");
    const scaleGroup = () =>
      document.querySelector<HTMLElement>('[data-calendar-group="scale-menu"]');

    beforeEach(() => {
      widths = mockGroupWidths(() => (fullWidthReads += 1));
      widths.groups["scale-menu"] = 0;
      widths.groups["date-arrows"] = 80;
    });

    afterEach(() => widths.restore());

    it("hides the date, keeping its buttons, where the scale-in-menu controls do not fit", async () => {
      mocks.entryWidth.set(140);
      render(CalendarLayoutView, {
        props: {
          panel: CalendarLayout.Classic,
          contentKey: "YEAR|2026"
        }
      });

      await waitFor(() => expect(controlsLevel()).toBe("5"));
      await settle();
      expect(controlsLevel()).toBe("5");
      expect(dateGroup()).toBe("date-arrows");
      expect(scaleGroup()?.classList.contains("hidden")).toBe(true);
      expect(
        document.querySelector<HTMLElement>(
          '[data-testid="calendar-context-controls"]'
        )?.style.columnGap
      ).toBe("0px");
      expect(overflowTrigger()).toBeTruthy();
    });

    it("shows the date again as the top bar widens", async () => {
      mocks.entryWidth.set(140);
      render(CalendarLayoutView, {
        props: {
          panel: CalendarLayout.Classic,
          contentKey: "YEAR|2026"
        }
      });
      await waitFor(() => expect(controlsLevel()).toBe("5"));

      mocks.entryWidth.set(160);
      await waitFor(() => expect(controlsLevel()).toBe("4"));
      expect(dateGroup()).toBe("date-short");
      expect(scaleGroup()?.classList.contains("hidden")).toBe(true);

      mocks.entryWidth.set(330);
      await waitFor(() => expect(controlsLevel()).toBe("3"));
      expect(dateGroup()).toBe("date-short");
      expect(scaleGroup()).toBeNull();
    });

    it("measures the short date before settling on hiding the date", async () => {
      widths.groups["date-short"] = 60;
      mocks.entryWidth.set(600);
      render(CalendarLayoutView, {
        props: {
          panel: CalendarLayout.Classic,
          contentKey: "YEAR|2026"
        }
      });
      await waitFor(() => expect(controlsLevel()).toBe("1"));
      await settle();

      mocks.entryWidth.set(140);
      await waitFor(() => expect(controlsLevel()).toBe("4"));
      const reads = fullWidthReads;
      await settle();
      expect(controlsLevel()).toBe("4");
      expect(dateGroup()).toBe("date-short");
      expect(fullWidthReads).toBe(reads);
    });

    it("keeps the scale and the other controls in the menu while the date is hidden", async () => {
      mocks.entryWidth.set(140);
      const scaleMenu = vi.fn(() => [
        {
          group: "scale",
          items: [],
          option: {
            label: "Scale",
            options: [{ value: "MONTH", label: "Month" }],
            value: "MONTH",
            onChange: vi.fn()
          }
        }
      ]);
      render(CalendarLayoutView, {
        props: {
          panel: CalendarLayout.Classic,
          contentKey: "YEAR|2026",
          overflowMenu: scaleMenu
        }
      });
      await waitFor(() => expect(controlsLevel()).toBe("5"));

      await fireEvent.click(overflowTrigger());
      const menu = await waitFor(() => {
        const element = openMenu();
        expect(element).toBeTruthy();
        return element!;
      });
      const text = menu.textContent ?? "";
      for (const label of [
        "Layout",
        "Scale",
        "Go to today",
        "Calendar settings"
      ])
        expect(text).toContain(label);
      expect(scaleMenu).toHaveBeenCalled();
    });

    it("keeps the hidden date while the menu is open and the content changes", async () => {
      mocks.entryWidth.set(140);
      const { rerender } = render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "YEAR|2026" }
      });
      await waitFor(() => expect(controlsLevel()).toBe("5"));
      await settle();
      await fireEvent.click(overflowTrigger());
      await waitFor(() => expect(openMenu()).toBeTruthy());
      const trigger = overflowTrigger();
      const reads = fullWidthReads;

      await rerender({ contentKey: "YEAR|2027" });
      await settle();
      expect(controlsLevel()).toBe("5");
      expect(openMenu()).toBeTruthy();
      expect(overflowTrigger()).toBe(trigger);
      expect(fullWidthReads).toBe(reads);

      await fireEvent.click(trigger);
      await waitFor(() => expect(openMenu()).toBeNull());
      await waitFor(() => expect(fullWidthReads).toBeGreaterThan(reads));
      await waitFor(() => expect(controlsLevel()).toBe("5"));
      const settledReads = fullWidthReads;
      await settle();
      expect(controlsLevel()).toBe("5");
      expect(fullWidthReads).toBe(settledReads);
    });

    it("keeps the hidden date while focus is in the controls and the content changes", async () => {
      mocks.entryWidth.set(140);
      const { rerender } = render(CalendarLayoutView, {
        props: { panel: CalendarLayout.Classic, contentKey: "YEAR|2026" }
      });
      await waitFor(() => expect(controlsLevel()).toBe("5"));
      await settle();
      const trigger = overflowTrigger();
      trigger.focus();
      const reads = fullWidthReads;

      await rerender({ contentKey: "YEAR|2027" });
      await settle();
      expect(controlsLevel()).toBe("5");
      expect(document.activeElement).toBe(trigger);
      expect(fullWidthReads).toBe(reads);

      trigger.blur();
      await waitFor(() => expect(fullWidthReads).toBeGreaterThan(reads));
      await waitFor(() => expect(controlsLevel()).toBe("5"));
      await settle();
      expect(controlsLevel()).toBe("5");
    });

    it("holds the reopened menu at the hidden date and keeps it there once it closes", async () => {
      mocks.entryWidth.set(140);
      requestCalendarOverflowMenuReopen();
      render(CalendarLayoutView, {
        props: {
          panel: CalendarLayout.Classic,
          contentKey: "YEAR|2026"
        }
      });
      await waitFor(() => expect(openMenu()).toBeTruthy());
      expect(controlsLevel()).toBe("5");
      const trigger = overflowTrigger();

      await fireEvent.click(trigger);
      await waitFor(() => expect(openMenu()).toBeNull());
      await settle();
      expect(overflowTrigger()).toBe(trigger);
      expect(controlsLevel()).toBe("5");
    });
  });
});
