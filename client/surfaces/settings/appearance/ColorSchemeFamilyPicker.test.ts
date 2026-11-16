import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ColorScheme } from "@21n/theme/appearance.type";
import {
  findColorSchemeFamily,
  resolveColorSchemeFamilies
} from "@21n/theme/colorscheme-catalog";
import colorSchemes from "@21n/theme/colorschemes.json";
import ColorSchemeFamilyPicker from "./ColorSchemeFamilyPicker.svelte";

const families = resolveColorSchemeFamilies(
  colorSchemes as unknown as ColorScheme[]
);

async function flush() {
  for (let i = 0; i < 3; i++) {
    await tick();
    await Promise.resolve();
  }
}

const cases = [
  {
    variant: "both" as const,
    label: "Colour scheme",
    testId: "color-scheme-family-picker",
    selectedId: "colorscheme:clean_tidyred_light",
    name: /^Colour scheme Red$/
  },
  {
    variant: "light" as const,
    label: "Light colour scheme",
    testId: "color-scheme-light-picker",
    selectedId: "colorscheme:clean_tidyred_light",
    name: /^Light colour scheme Red$/
  },
  {
    variant: "dark" as const,
    label: "Dark colour scheme",
    testId: "color-scheme-dark-picker",
    selectedId: "colorscheme:clean_tidyoxide_dark",
    name: /^Dark colour scheme Oxide$/
  }
];

describe.each(cases)(
  "ColorSchemeFamilyPicker ($variant)",
  ({ variant, label, testId, selectedId, name }) => {
    const modalEscape = vi.fn();
    const onWindowKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") modalEscape();
    };

    beforeEach(() => {
      document.body.innerHTML = '<div id="popovers"></div>';
      modalEscape.mockClear();
      window.addEventListener("keydown", onWindowKeydown);
    });

    afterEach(() => {
      window.removeEventListener("keydown", onWindowKeydown);
    });

    function renderPicker(onSelect = vi.fn()) {
      render(ColorSchemeFamilyPicker, {
        props: {
          label,
          variant,
          testId,
          families,
          selected: findColorSchemeFamily(families, selectedId),
          onSelect
        }
      });
      return screen.getByRole("button", { name });
    }

    async function open(trigger: HTMLElement) {
      trigger.focus();
      await fireEvent.click(trigger);
      await flush();
      return screen.getByRole("listbox", { name: label });
    }

    it("names the trigger by its label and current scheme and exposes expanded state", async () => {
      const trigger = renderPicker();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      const listbox = await open(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(
        within(listbox).getByRole("group", { name: "Nucleum" })
      ).toBeTruthy();
      expect(
        within(listbox).getByRole("group", { name: "Developer" })
      ).toBeTruthy();
    });

    it("closes only the list on Escape from the search field or an option", async () => {
      const trigger = renderPicker();
      await open(trigger);
      const search = screen.getByTestId("color-scheme-search");
      const input = search.matches("input")
        ? search
        : (search.querySelector("input") as HTMLElement);
      await fireEvent.keyDown(input, { key: "Escape" });
      await flush();
      expect(screen.queryByTestId("color-scheme-family-list")).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      await open(trigger);
      const option = screen.getAllByTestId("color-scheme-family-option")[0];
      option.focus();
      await fireEvent.keyDown(option, { key: "Escape" });
      await flush();
      expect(screen.queryByTestId("color-scheme-family-list")).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(modalEscape).not.toHaveBeenCalled();
    });

    it("returns focus to the trigger after picking an option", async () => {
      const onSelect = vi.fn();
      const trigger = renderPicker(onSelect);
      await open(trigger);
      const option = screen.getAllByTestId("color-scheme-family-option")[0];
      option.focus();
      await fireEvent.click(option);
      await flush();
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("color-scheme-family-list")).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      await open(trigger);
      expect(screen.getByTestId("color-scheme-family-list")).toBeTruthy();
    });
  }
);
