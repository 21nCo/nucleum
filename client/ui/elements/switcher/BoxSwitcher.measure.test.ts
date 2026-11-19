import { render } from "@testing-library/svelte";
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

  it("measures More with the largest count it can show, whatever row is decided", () => {
    const { container } = render(BoxSwitcher, {
      props: {
        options,
        selected: "notes",
        isOverflowToMenu: true,
        overflowWidth: 300,
        overflowTrailing: trailing
      }
    });

    // Three other options and the trailing entry.
    expect(measuredMoreLabel(container)).toBe("+4");
  });

  it("counts only the other options when no trailing controls can move in", () => {
    const { container } = render(BoxSwitcher, {
      props: { options, selected: "notes", isOverflowToMenu: true }
    });

    expect(measuredMoreLabel(container)).toBe("+3");
  });
});
