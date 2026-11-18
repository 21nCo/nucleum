import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Theme } from "@21n/theme/appearance.type";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
import appearance from "@nucleum/shared-state/appearance/appearance.store";

const blueLight = "colorscheme:clean_tidyblue_light";
const blueDark = "colorscheme:clean_tidyblue_dark";
const redLight = "colorscheme:clean_tidyred_light";
const redDark = "colorscheme:clean_tidyred_dark";
const oxideDark = "colorscheme:clean_tidyoxide_dark";

describe("appearance.setColorSchemePair", () => {
  const persisted = vi.fn();
  const onPersist = (event: Event) => persisted((event as CustomEvent).detail);

  beforeEach(() => {
    appearance.update((a) => ({
      ...a,
      isSyncWithSystem: false,
      userThemeSetting: Theme.LIGHT,
      systemTheme: Theme.LIGHT,
      theme: Theme.LIGHT,
      lightColorSchemeId: blueLight,
      darkColorSchemeId: blueDark
    }));
    persisted.mockClear();
    window.addEventListener(GlobalEvent.PERSIST_APPEARANCE_USER, onPersist);
  });

  afterEach(() => {
    window.removeEventListener(GlobalEvent.PERSIST_APPEARANCE_USER, onPersist);
  });

  it("applies a valid light and dark pair together and persists it", () => {
    appearance.setColorSchemePair(redLight, oxideDark);
    const state = get(appearance);
    expect(state.lightColorSchemeId).toBe(redLight);
    expect(state.darkColorSchemeId).toBe(oxideDark);
    expect(persisted).toHaveBeenCalledTimes(1);
    expect(persisted.mock.calls[0][0]).toMatchObject({
      lightColorSchemeId: redLight,
      darkColorSchemeId: oxideDark
    });
  });

  it("keeps each slot whose id has the wrong polarity", () => {
    appearance.setColorSchemePair(redDark, oxideDark);
    expect(get(appearance).lightColorSchemeId).toBe(blueLight);
    expect(get(appearance).darkColorSchemeId).toBe(oxideDark);

    appearance.setColorSchemePair(redLight, redLight);
    expect(get(appearance).lightColorSchemeId).toBe(redLight);
    expect(get(appearance).darkColorSchemeId).toBe(oxideDark);
  });

  it("keeps a variant whose id is missing or unknown", () => {
    appearance.setColorSchemePair(undefined, redDark);
    expect(get(appearance).lightColorSchemeId).toBe(blueLight);
    expect(get(appearance).darkColorSchemeId).toBe(redDark);

    appearance.setColorSchemePair(redLight, "colorscheme:unknown_dark");
    expect(get(appearance).lightColorSchemeId).toBe(redLight);
    expect(get(appearance).darkColorSchemeId).toBe(redDark);
  });

  it("changes nothing and persists nothing when no id is acceptable", () => {
    const before = get(appearance);
    appearance.setColorSchemePair(blueDark, blueLight);
    appearance.setColorSchemePair("colorscheme:unknown", undefined);
    appearance.setColorSchemePair();
    expect(get(appearance)).toBe(before);
    expect(persisted).not.toHaveBeenCalled();
  });

  it("makes the scheme for the manual theme active", () => {
    appearance.modifyUserThemeSetting(Theme.DARK);
    appearance.setColorSchemePair(redLight, oxideDark);
    expect(get(appearance).theme).toBe(Theme.DARK);
    expect(get(appearance).colorScheme.id).toBe(oxideDark);

    appearance.modifyUserThemeSetting(Theme.LIGHT);
    appearance.setColorSchemePair(blueLight, redDark);
    expect(get(appearance).colorScheme.id).toBe(blueLight);
  });

  it("makes the scheme for the system theme active when synced", () => {
    appearance.modifySyncWithSystem(true);
    appearance.setSystemTheme(true);
    appearance.setColorSchemePair(redLight, oxideDark);
    expect(get(appearance).theme).toBe(Theme.DARK);
    expect(get(appearance).colorScheme.id).toBe(oxideDark);

    appearance.setSystemTheme(false);
    appearance.setColorSchemePair(blueLight, redDark);
    expect(get(appearance).theme).toBe(Theme.LIGHT);
    expect(get(appearance).colorScheme.id).toBe(blueLight);
  });
});
