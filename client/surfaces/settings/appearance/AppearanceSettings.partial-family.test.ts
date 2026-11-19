import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia;
});

vi.mock("@21n/theme/colorschemes.json", async (importOriginal) => {
  const original = await importOriginal<{ default: { id: string }[] }>();
  return {
    default: original.default.filter(
      (scheme) => scheme.id !== "colorscheme:clean_tidyred_dark"
    )
  };
});
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));
vi.mock(
  "@nucleum/surfaces/settings/appearance/AppearanceProfiles.svelte",
  () => ({ default: () => {} })
);
vi.mock(
  "@nucleum/surfaces/settings/appearance/TypefaceSelector.svelte",
  () => ({ default: () => {} })
);
vi.mock(
  "@nucleum/surfaces/settings/appearance/AppStyleSelector.svelte",
  () => ({ default: () => {} })
);
vi.mock(
  "@nucleum/surfaces/settings/appearance/InterfaceSettings.svelte",
  () => ({ default: () => {} })
);

import type { ColorScheme } from "@21n/theme/appearance.type";
import colorSchemes from "@21n/theme/colorschemes.json";
import { resolveColorSchemeFamilies } from "@21n/theme/colorscheme-catalog";
import appearance from "@nucleum/shared-state/appearance/appearance.store";
import AppearanceSettings from "./AppearanceSettings.svelte";

const redLight = "colorscheme:clean_tidyred_light";
const blueLight = "colorscheme:clean_tidyblue_light";
const blueDark = "colorscheme:clean_tidyblue_dark";

async function flush() {
  for (let i = 0; i < 3; i++) {
    await tick();
    await Promise.resolve();
  }
}

function mixedSwitch() {
  return screen
    .getByTestId("toggle-mixed-color-schemes")
    .querySelector('input[type="checkbox"]') as HTMLInputElement;
}

async function openFamilyOptions() {
  await fireEvent.click(screen.getByTestId("color-scheme-family-picker"));
  await flush();
  return screen.getAllByTestId("color-scheme-family-option");
}

describe("AppearanceSettings with a light-only colour scheme family", () => {
  const families = resolveColorSchemeFamilies(
    colorSchemes as unknown as ColorScheme[]
  );

  beforeEach(() => {
    document.body.innerHTML = '<div id="popovers"></div>';
  });

  it("resolves Red with only its light scheme", () => {
    const red = families.find((family) => family.id === "red");
    expect(red?.light).toBeDefined();
    expect(red?.dark).toBeUndefined();
  });

  it("applies a complete family when switching off from a light-only family's scheme", async () => {
    appearance.update((a) => ({
      ...a,
      lightColorSchemeId: redLight,
      darkColorSchemeId: blueDark
    }));
    const view = render(AppearanceSettings);
    await flush();
    expect(mixedSwitch().checked).toBe(true);

    await fireEvent.click(mixedSwitch());
    await flush();
    expect(get(appearance).lightColorSchemeId).toBe(blueLight);
    expect(get(appearance).darkColorSchemeId).toBe(blueDark);
    expect(mixedSwitch().checked).toBe(false);
    expect(screen.queryByTestId("color-scheme-light-picker")).toBeNull();
    expect(screen.queryByTestId("color-scheme-dark-picker")).toBeNull();
    expect(
      screen.getByTestId("color-scheme-family-picker").textContent
    ).toContain("Blue");

    view.unmount();
    document.body.innerHTML = '<div id="popovers"></div>';
    render(AppearanceSettings);
    await flush();
    expect(mixedSwitch().checked).toBe(false);
    expect(screen.queryByTestId("color-scheme-light-picker")).toBeNull();
    expect(
      screen.getByTestId("color-scheme-family-picker").textContent
    ).toContain("Blue");
  });

  it("lists no partial family and applies exactly the pair of each offered family", async () => {
    appearance.update((a) => ({
      ...a,
      lightColorSchemeId: blueLight,
      darkColorSchemeId: blueDark
    }));
    render(AppearanceSettings);
    await flush();
    const listed = await openFamilyOptions();
    const offered = listed.map((option) => option.dataset.familyId!);
    await fireEvent.keyDown(listed[0], { key: "Escape" });
    await flush();
    expect(offered).not.toContain("red");
    expect(offered).toContain("blue");

    for (const id of offered) {
      const options = await openFamilyOptions();
      const option = options.find((o) => o.dataset.familyId === id)!;
      await fireEvent.click(option);
      await flush();
      const family = families.find((f) => f.id === id)!;
      expect(get(appearance).lightColorSchemeId).toBe(family.lightId);
      expect(get(appearance).darkColorSchemeId).toBe(family.darkId);
      expect(mixedSwitch().checked).toBe(false);
      expect(screen.queryByTestId("color-scheme-light-picker")).toBeNull();
    }
  });
});
