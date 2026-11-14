import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
import type { IContextMenuGroup } from "@21n/ui/elements/contextMenu/context-menu.type";

vi.mock("@21n/ui/elements/markdown/markdown.utils", () => ({
  renderMdAsHtml: (value: string) => value
}));

const scaleOptions = ["Day", "Week", "Month", "Year", "Heatmap"].map(
  (label) => ({ label, value: label.toLowerCase() })
);

function submenuOption(name: string) {
  const option = document.querySelector<HTMLElement>(
    `#secondary-popovers [role="radio"][data-option-value="${name}"]`
  );
  if (!option) throw new Error(`Submenu option ${name} is not shown`);
  return option;
}

function checkedSubmenuOption() {
  return document
    .querySelector('#secondary-popovers [role="radio"][aria-checked="true"]')
    ?.getAttribute("data-option-value");
}

describe("context menu option submenu", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    const popovers = document.createElement("div");
    popovers.id = "popovers";
    const secondary = document.createElement("div");
    secondary.id = "secondary-popovers";
    document.body.append(popovers, secondary);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("keeps the menu open and moves the checked option on each submenu pick", async () => {
    const onChange = vi.fn();
    const menu: IContextMenuGroup[] = [
      {
        group: "scale",
        items: [],
        option: {
          label: "Scale",
          options: scaleOptions,
          value: "month",
          onChange
        }
      }
    ];
    const { getByRole } = render(ContextMenuAction, {
      props: { id: "optionSubmenuTest", menuResolver: () => menu }
    });

    await fireEvent.click(getByRole("button", { name: "Actions" }));
    const row = await waitFor(() => {
      const element = document.querySelector<HTMLElement>(
        '#popovers [data-context-menu-item-id="option-Scale"]'
      );
      expect(element?.textContent).toContain("Scale: Month");
      return element!;
    });

    await fireEvent.click(row);
    await waitFor(() => expect(checkedSubmenuOption()).toBe("month"));

    await fireEvent.click(submenuOption("week"));
    expect(onChange).toHaveBeenLastCalledWith("week");
    await waitFor(() => expect(checkedSubmenuOption()).toBe("week"));
    expect(document.querySelector("#popovers .popover")).toBeTruthy();
    expect(row.isConnected).toBe(true);
    expect(row.textContent).toContain("Scale: Week");

    await fireEvent.click(submenuOption("month"));
    expect(onChange).toHaveBeenLastCalledWith("month");
    expect(onChange).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(checkedSubmenuOption()).toBe("month"));
    expect(document.querySelector("#popovers .popover")).toBeTruthy();
    expect(row.textContent).toContain("Scale: Month");
  });

  it("never picks a disabled option in the submenu", async () => {
    const onChange = vi.fn();
    const menu: IContextMenuGroup[] = [
      {
        group: "scale",
        items: [],
        option: {
          label: "Scale",
          options: scaleOptions.map((item) => ({
            ...item,
            isDisabled: item.value === "year"
          })),
          value: "month",
          onChange
        }
      }
    ];
    const { getByRole } = render(ContextMenuAction, {
      props: { id: "optionSubmenuDisabledTest", menuResolver: () => menu }
    });

    await fireEvent.click(getByRole("button", { name: "Actions" }));
    const row = await waitFor(() => {
      const element = document.querySelector<HTMLElement>(
        '#popovers [data-context-menu-item-id="option-Scale"]'
      );
      expect(element).toBeTruthy();
      return element!;
    });
    await fireEvent.click(row);
    await waitFor(() => expect(checkedSubmenuOption()).toBe("month"));

    const year = submenuOption("year");
    expect(year.hasAttribute("disabled")).toBe(true);
    await fireEvent.click(year);
    expect(onChange).not.toHaveBeenCalled();
    expect(checkedSubmenuOption()).toBe("month");
    expect(row.textContent).toContain("Scale: Month");
  });
});
