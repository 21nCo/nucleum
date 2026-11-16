import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ColorScheme } from "@21n/theme/appearance.type";
import {
  ColorSchemeCategory,
  colorSchemeVariantFamilies,
  findColorSchemeFamily,
  groupColorSchemeFamilies,
  resolveColorSchemeFamilies
} from "@21n/theme/colorscheme-catalog";
import colorSchemes from "@21n/theme/colorschemes.json";
import ColorSchemeFamilyPicker from "./ColorSchemeFamilyPicker.svelte";

const families = resolveColorSchemeFamilies(
  colorSchemes as unknown as ColorScheme[]
);

function searchInput() {
  const search = screen.getByTestId("color-scheme-search");
  return search.matches("input")
    ? search
    : (search.querySelector("input") as HTMLElement);
}

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

    it("moves between filtered options with the arrow keys across groups and stops at the ends", async () => {
      const trigger = renderPicker();
      await open(trigger);
      const input = searchInput();
      await fireEvent.input(input, { target: { value: "o" } });
      await flush();
      const expected = groupColorSchemeFamilies(
        colorSchemeVariantFamilies(families, variant),
        "o",
        variant
      );
      const ids = expected.flatMap((group) =>
        group.families.map((family) => family.id)
      );
      const options = screen.getAllByTestId("color-scheme-family-option");
      expect(options.map((option) => option.dataset.familyId)).toEqual(ids);
      expect(expected.length).toBeGreaterThan(1);

      await fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(document.activeElement).toBe(options[0]);
      for (const option of options.slice(1)) {
        await fireEvent.keyDown(document.activeElement as HTMLElement, {
          key: "ArrowDown"
        });
        expect(document.activeElement).toBe(option);
      }
      await fireEvent.keyDown(document.activeElement as HTMLElement, {
        key: "ArrowDown"
      });
      expect(document.activeElement).toBe(options.at(-1));

      await fireEvent.keyDown(options.at(-1) as HTMLElement, { key: "Home" });
      expect(document.activeElement).toBe(options[0]);
      await fireEvent.keyDown(options[0], { key: "End" });
      expect(document.activeElement).toBe(options.at(-1));
      await fireEvent.keyDown(options.at(-1) as HTMLElement, {
        key: "ArrowUp"
      });
      expect(document.activeElement).toBe(options.at(-2));

      options[0].focus();
      await fireEvent.keyDown(options[0], { key: "ArrowUp" });
      expect(document.activeElement).toBe(input);
      expect(screen.getByTestId("color-scheme-family-list")).toBeTruthy();
    });

    it("keeps Escape and selection working after arrow navigation", async () => {
      const onSelect = vi.fn();
      const trigger = renderPicker(onSelect);
      await open(trigger);
      await fireEvent.keyDown(searchInput(), { key: "ArrowDown" });
      await fireEvent.keyDown(document.activeElement as HTMLElement, {
        key: "Escape"
      });
      await flush();
      expect(screen.queryByTestId("color-scheme-family-list")).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(modalEscape).not.toHaveBeenCalled();

      await open(trigger);
      await fireEvent.keyDown(searchInput(), { key: "ArrowDown" });
      await fireEvent.keyDown(document.activeElement as HTMLElement, {
        key: "ArrowDown"
      });
      const focused = document.activeElement as HTMLElement;
      expect(focused).toBe(
        screen.getAllByTestId("color-scheme-family-option")[1]
      );
      await fireEvent.click(focused);
      await flush();
      expect(onSelect).toHaveBeenCalledWith(
        families.find((family) => family.id === focused.dataset.familyId)
      );
      expect(document.activeElement).toBe(trigger);
    });
  }
);

describe("ColorSchemeFamilyPicker with partially defined families", () => {
  const scheme = (id: string, isDark = false) =>
    ({ id, isDark, label: id, colors: {} }) as unknown as ColorScheme;
  const partial = resolveColorSchemeFamilies(
    [scheme("a-light"), scheme("b-dark", true)],
    [
      {
        id: "a",
        label: "A",
        category: ColorSchemeCategory.Nucleum,
        lightId: "a-light",
        darkId: "a-dark"
      },
      {
        id: "b",
        label: "B",
        category: ColorSchemeCategory.Developer,
        lightId: "b-light",
        darkId: "b-dark"
      }
    ]
  );

  beforeEach(() => {
    document.body.innerHTML = '<div id="popovers"></div>';
  });

  it.each([
    { variant: "light" as const, ids: ["a"] },
    { variant: "dark" as const, ids: ["b"] }
  ])(
    "offers only families whose $variant scheme is defined",
    async ({ variant, ids }) => {
      const onSelect = vi.fn();
      render(ColorSchemeFamilyPicker, {
        props: {
          label: "Scheme",
          variant,
          testId: "partial-picker",
          families: partial,
          selected: undefined,
          onSelect
        }
      });
      await fireEvent.click(screen.getByTestId("partial-picker"));
      await flush();
      const options = screen.getAllByTestId("color-scheme-family-option");
      expect(options.map((option) => option.dataset.familyId)).toEqual(ids);
      await fireEvent.click(options[0]);
      const picked = onSelect.mock.calls[0][0];
      expect(variant === "light" ? picked.light : picked.dark).toBeDefined();
    }
  );

  it("offers no partial family when picking both variants", async () => {
    render(ColorSchemeFamilyPicker, {
      props: {
        label: "Scheme",
        testId: "partial-picker",
        families: partial,
        selected: undefined,
        onSelect: vi.fn()
      }
    });
    await fireEvent.click(screen.getByTestId("partial-picker"));
    await flush();
    expect(screen.queryAllByTestId("color-scheme-family-option")).toEqual([]);
  });
});
