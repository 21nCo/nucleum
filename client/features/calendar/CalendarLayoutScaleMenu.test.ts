import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";
import type { IContextMenuGroup } from "@21n/ui/elements/contextMenu/context-menu.type";

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
  uiState: { setState: vi.fn() }
}));

import CalendarLayoutView from "@nucleum/features/calendar/CalendarLayout.svelte";
import view from "@21n/ui/environment/view.store";

const SCALES = ["DAY", "WEEK", "MONTH", "YEAR", "heatmap"];

function scaleMenuGroup(onChange: (value: unknown) => void) {
  return (): IContextMenuGroup[] => [
    {
      group: "scale",
      items: [],
      option: {
        label: "Scale",
        options: SCALES.map((value) => ({ value, label: value })),
        value: "WEEK",
        onChange
      }
    }
  ];
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
  return waitFor(() => {
    const menu = document.querySelector<HTMLElement>(
      "#popovers #calendarContextZoneMenu"
    );
    expect(menu).toBeTruthy();
    return menu!;
  });
}

function scaleRow(menu: HTMLElement) {
  return Array.from(
    menu.querySelectorAll<HTMLElement>("button.contextmenuitem")
  ).find((button) => button.textContent?.includes("Scale"));
}

describe("CalendarLayout scale in the overflow menu", () => {
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
        return this.dataset.testid === "calendar-context-controls" ? 400 : 0;
      }
    });
    mocks.entryWidth.set(100);
    const popovers = document.createElement("div");
    popovers.id = "popovers";
    const secondary = document.createElement("div");
    secondary.id = "secondary-popovers";
    document.body.append(popovers, secondary);
  });

  afterEach(() => {
    view.refresh(window.innerWidth, window.innerHeight);
    if (scrollWidth)
      Object.defineProperty(HTMLElement.prototype, "scrollWidth", scrollWidth);
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("offers the scale as a submenu whose option a pointer picks", async () => {
    view.refresh(1200, 900);
    const onChange = vi.fn();
    render(CalendarLayoutView, {
      props: {
        panel: CalendarLayout.Classic,
        overflowMenu: scaleMenuGroup(onChange)
      }
    });
    const row = scaleRow(await openOverflowMenu());
    expect(row?.textContent).toContain("Scale: WEEK");

    await fireEvent.click(row!);
    const day = await waitFor(() => {
      const option = document.querySelector<HTMLElement>(
        '#secondary-popovers [role="radio"][data-option-value="DAY"]'
      );
      expect(option).toBeTruthy();
      return option!;
    });
    await fireEvent.click(day);

    expect(onChange).toHaveBeenCalledWith("DAY");
  });

  it("leaves the scale out of the menu at a constrained width", async () => {
    view.refresh(800, 900);
    render(CalendarLayoutView, {
      props: {
        panel: CalendarLayout.Classic,
        overflowMenu: scaleMenuGroup(vi.fn())
      }
    });
    const menu = await openOverflowMenu();

    expect(menu.textContent).toContain("Go to today");
    expect(scaleRow(menu)).toBeUndefined();
  });
});
