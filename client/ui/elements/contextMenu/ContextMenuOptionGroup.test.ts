import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ContextMenuOptionGroup from "@21n/ui/elements/contextMenu/ContextMenuOptionGroup.svelte";

vi.mock("@21n/ui/actions/popover.action", () => ({
  popover: () => ({ update: () => undefined, destroy: () => undefined }),
  tooltip: () => ({ update: () => undefined, destroy: () => undefined })
}));

const options = (...labels: string[]) =>
  labels.map((label) => ({ label, value: label.toLowerCase() }));

describe("ContextMenuOptionGroup", () => {
  it("shows two short options as a segmented switcher and marks the active one", async () => {
    const onChange = vi.fn();
    const { getByTestId, getByRole } = render(ContextMenuOptionGroup, {
      props: {
        option: {
          label: "View",
          options: options("Side nav", "Wall"),
          value: "side nav",
          onChange
        }
      }
    });
    expect(getByTestId("context-menu-option-group").dataset.layout).toBe(
      "segmented"
    );
    expect(
      getByRole("radio", { name: "Side nav" }).getAttribute("aria-checked")
    ).toBe("true");
    await fireEvent.click(getByRole("radio", { name: "Wall" }));
    expect(onChange).toHaveBeenCalledWith("wall");
    expect(
      getByRole("radio", { name: "Wall" }).getAttribute("aria-checked")
    ).toBe("true");
  });

  it("lists four options as radios under the setting caption", async () => {
    const onChange = vi.fn();
    const { getByTestId, getByRole, getByText } = render(
      ContextMenuOptionGroup,
      {
        props: {
          option: {
            label: "Layout",
            options: options("One", "Two", "Three", "Four"),
            value: "one",
            onChange
          }
        }
      }
    );
    expect(getByTestId("context-menu-option-group").dataset.layout).toBe(
      "radio"
    );
    expect(getByText("Layout")).toBeTruthy();
    await fireEvent.click(getByRole("menuitemradio", { name: "Three" }));
    expect(onChange).toHaveBeenCalledWith("three");
  });

  it("moves five or more options into a submenu that names the current one", () => {
    const { getByTestId, getByText } = render(ContextMenuOptionGroup, {
      props: {
        option: {
          label: "Scale",
          options: options("Day", "Week", "Month", "Year", "Heatmap"),
          value: "month",
          onChange: vi.fn()
        }
      }
    });
    expect(getByTestId("context-menu-option-group").dataset.layout).toBe(
      "submenu"
    );
    expect(getByText("Scale: Month")).toBeTruthy();
  });
});
