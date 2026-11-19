import { render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BoxSwitcher from "@21n/ui/elements/switcher/BoxSwitcher.svelte";

const options = ["Overview", "Notes", "Tasks", "Files"].map((label) => ({
  label,
  value: label.toLowerCase(),
  icon: "star"
}));

const trailing = {
  width: 48,
  menuItem: { value: "actions", label: "Actions" }
};

describe("BoxSwitcher More measuring copy", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
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
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  function measuredMoreLabel(container: HTMLElement) {
    return container
      .querySelector("[data-switcher-more]")
      ?.textContent?.replace(/\s+/g, "");
  }

  it("measures More with every option and the trailing entry counted, whatever row is decided", () => {
    const { container } = render(BoxSwitcher, {
      props: {
        options,
        selected: "notes",
        isOverflowToMenu: true,
        overflowWidth: 300,
        overflowTrailing: trailing
      }
    });

    expect(measuredMoreLabel(container)).toBe("+5");
  });

  it("counts every option when no trailing controls can move in", () => {
    const { container } = render(BoxSwitcher, {
      props: { options, selected: "notes", isOverflowToMenu: true }
    });

    expect(measuredMoreLabel(container)).toBe("+4");
  });
});

const rowOptions = [
  { label: "Short", value: "short", icon: "star" },
  { label: "Middle", value: "middle", icon: "star" },
  { label: "Long", value: "long", icon: "star" }
];
const rowWidths: Record<string, number> = {
  Short: 20,
  Middle: 40,
  Long: 100
};
const rowTrailing = {
  width: 40,
  menuItem: { value: "actions", label: "Actions" }
};

describe("BoxSwitcher row beside trailing controls", () => {
  const rootWidth = 160;

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
      rootWidth
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        let width = 0;
        if (this.hasAttribute("data-switcher-option"))
          width = rowWidths[this.getAttribute("aria-label") ?? ""] ?? 0;
        else if (this.hasAttribute("data-switcher-compact")) width = 30;
        else if (this.hasAttribute("data-switcher-more")) width = 30;
        return { width } as DOMRect;
      }
    );
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function renderMeasured(props: Record<string, unknown>) {
    return render(BoxSwitcher, {
      props: {
        options: rowOptions,
        selected: "long",
        isTablist: true,
        isOverflowToMenu: true,
        ...props
      }
    }).container;
  }

  function selectedLabel(container: HTMLElement) {
    return container
      .querySelector("[role=tab][aria-selected=true]")
      ?.textContent?.trim();
  }

  it("keeps the selected label when the measured root fits the row, counting the trailing controls once", async () => {
    const container = renderMeasured({ overflowTrailing: rowTrailing });
    await waitFor(() =>
      expect((container.firstElementChild as HTMLElement).style.width).toBe(
        "160px"
      )
    );

    expect(selectedLabel(container)).toBe("Long");
    expect(container.querySelector("[data-testid=switcher-more]")).toBeNull();
  });

  it("still takes the trailing controls off an explicit width that includes them", async () => {
    const container = renderMeasured({
      overflowWidth: 160,
      overflowTrailing: rowTrailing
    });

    await waitFor(() => expect(selectedLabel(container)).toBe(""));
  });
});
