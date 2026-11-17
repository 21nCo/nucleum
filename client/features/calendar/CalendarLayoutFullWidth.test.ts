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
});
