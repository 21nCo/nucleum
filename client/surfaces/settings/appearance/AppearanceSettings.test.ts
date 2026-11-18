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

import appearance from "@nucleum/shared-state/appearance/appearance.store";
import AppearanceSettings from "./AppearanceSettings.svelte";

const redDark = "colorscheme:clean_tidyred_dark";
const redLight = "colorscheme:clean_tidyred_light";

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

describe("AppearanceSettings mixed colour scheme switch", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="popovers"></div>';
  });

  it("applies the dark scheme's family when the light id is unknown", async () => {
    appearance.update((a) => ({
      ...a,
      lightColorSchemeId: "colorscheme:unknown_light",
      darkColorSchemeId: redDark
    }));
    const view = render(AppearanceSettings);
    await flush();
    expect(mixedSwitch().checked).toBe(true);
    expect(screen.queryByTestId("color-scheme-family-picker")).toBeNull();

    await fireEvent.click(mixedSwitch());
    await flush();
    expect(get(appearance).lightColorSchemeId).toBe(redLight);
    expect(get(appearance).darkColorSchemeId).toBe(redDark);
    expect(mixedSwitch().checked).toBe(false);
    const picker = screen.getByTestId("color-scheme-family-picker");
    expect(picker.textContent).toContain("Red");
    expect(
      picker.querySelector(`[data-scheme-swatch="${redDark}"]`)
    ).not.toBeNull();
    expect(screen.queryByTestId("color-scheme-light-picker")).toBeNull();

    view.unmount();
    render(AppearanceSettings);
    await flush();
    expect(mixedSwitch().checked).toBe(false);
    expect(
      screen.getByTestId("color-scheme-family-picker").textContent
    ).toContain("Red");
  });

  it("falls back to Default when neither scheme is in a family", async () => {
    appearance.update((a) => ({
      ...a,
      lightColorSchemeId: "colorscheme:unknown_light",
      darkColorSchemeId: "colorscheme:unknown_dark"
    }));
    render(AppearanceSettings);
    await flush();
    expect(mixedSwitch().checked).toBe(true);

    await fireEvent.click(mixedSwitch());
    await flush();
    expect(mixedSwitch().checked).toBe(false);
    expect(
      screen.getByTestId("color-scheme-family-picker").textContent
    ).toContain("Default");
  });
});
