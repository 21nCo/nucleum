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
    await fireEvent.click(getByRole("radio", { name: "Three" }));
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

  it("keeps one tab stop on the checked segment and moves it with arrow keys", async () => {
    const onChange = vi.fn();
    const { getByRole } = render(ContextMenuOptionGroup, {
      props: {
        option: {
          label: "View",
          options: [
            { label: "Day", value: "day" },
            { label: "Week", value: "week", isDisabled: true },
            { label: "Month", value: "month" }
          ],
          value: "day",
          onChange
        }
      }
    });
    const day = getByRole("radio", { name: "Day" });
    const month = getByRole("radio", { name: "Month" });
    expect(day.tabIndex).toBe(0);
    expect(month.tabIndex).toBe(-1);

    day.focus();
    await fireEvent.keyDown(day, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("month");
    expect(document.activeElement).toBe(month);
    expect(month.getAttribute("aria-checked")).toBe("true");
    expect(month.tabIndex).toBe(0);
    expect(day.tabIndex).toBe(-1);

    await fireEvent.keyDown(month, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("day");
    expect(document.activeElement).toBe(day);

    await fireEvent.keyDown(day, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("month");
    expect(onChange).not.toHaveBeenCalledWith("week");
  });

  it("selects radio list options with arrow keys", async () => {
    const onChange = vi.fn();
    const { getByRole } = render(ContextMenuOptionGroup, {
      props: {
        option: {
          label: "Layout",
          options: options("One", "Two", "Three", "Four"),
          value: "one",
          onChange
        }
      }
    });
    expect(getByRole("radiogroup", { name: "Layout" })).toBeTruthy();
    const one = getByRole("radio", { name: "One" });
    expect(one.tabIndex).toBe(0);
    one.focus();
    await fireEvent.keyDown(one, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("four");
    expect(document.activeElement).toBe(getByRole("radio", { name: "Four" }));
  });

  it.each([
    ["segmented", ["Day", "Week"]],
    ["radio", ["One", "Two", "Three", "Four"]]
  ])(
    "never picks a disabled option in the %s layout",
    async (layout, labels) => {
      const onChange = vi.fn();
      const items = options(...labels).map((item, index) => ({
        ...item,
        isDisabled: index === 1
      }));
      const { getByTestId, getByRole } = render(ContextMenuOptionGroup, {
        props: {
          option: {
            label: "View",
            options: items,
            value: items[0].value,
            onChange
          }
        }
      });
      expect(getByTestId("context-menu-option-group").dataset.layout).toBe(
        layout
      );
      const disabled = getByRole("radio", { name: labels[1] });
      expect(disabled.hasAttribute("disabled")).toBe(true);
      await fireEvent.click(disabled);
      expect(onChange).not.toHaveBeenCalled();
      expect(disabled.getAttribute("aria-checked")).toBe("false");
    }
  );

  it("truncates a long setting label so the segmented options keep their width", () => {
    const label = "A setting label far too long to fit beside its options";
    const { getByTestId, getByRole } = render(ContextMenuOptionGroup, {
      props: {
        option: {
          label,
          options: options("Day", "Week"),
          value: "day",
          onChange: vi.fn()
        }
      }
    });
    const caption = getByTestId("context-menu-option-label");
    expect(caption.classList.contains("truncate")).toBe(true);
    expect(caption.classList.contains("min-w-0")).toBe(true);
    expect(caption.classList.contains("shrink-0")).toBe(false);
    expect(caption.getAttribute("title")).toBe(label);
    const track = getByRole("radio", { name: "Day" }).parentElement!;
    expect(track.classList.contains("shrink-0")).toBe(true);
    expect(getByRole("radiogroup", { name: label })).toBeTruthy();
  });
});
