import { describe, expect, it } from "vitest";
import { AppStyle } from "@21n/theme/app-style";
import { Theme } from "@21n/theme/appearance.type";
import {
  builtInAppearanceProfiles,
  isAppearanceDifferent,
  resolveAppearanceProfiles,
  resolveAppearanceProfilesState,
  resolveApplyProfilePatch,
  resolveCurrentAppearance,
  snapshotAppearance
} from "./appearance-profiles";
import { seedUserPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
import type { StoredAppearanceProfile } from "@nucleum/shared-state/preferences/user-preferences.type";

const seedAppearance = seedUserPreferences.appearance;

const roundedDark: StoredAppearanceProfile = {
  name: "Night",
  settings: {
    ...snapshotAppearance(seedAppearance),
    isSyncWithSystem: false,
    userThemeSetting: Theme.DARK,
    appStyle: AppStyle.Rounded,
    typeface: "Sen"
  },
  createdAt: 2
};

describe("appearance profiles", () => {
  it("snapshots only the profile fields", () => {
    const snapshot = snapshotAppearance({
      ...seedAppearance,
      isBlurredBgForPopups: true,
      appStyle: AppStyle.Semi
    });
    expect(snapshot).toEqual({
      isSyncWithSystem: seedAppearance.isSyncWithSystem,
      lightColorSchemeId: String(seedAppearance.lightColorSchemeId),
      darkColorSchemeId: String(seedAppearance.darkColorSchemeId),
      userThemeSetting: seedAppearance.userThemeSetting,
      typeface: seedAppearance.typeface,
      appStyle: AppStyle.Semi
    });
  });

  it("lists built-ins first, then live user profiles in creation order, skipping deleted ones", () => {
    const profiles = resolveAppearanceProfiles({
      appearanceProfiles: {
        b: roundedDark,
        a: { ...roundedDark, name: "Day", createdAt: 1 },
        gone: null
      }
    });
    expect(profiles.map((profile) => profile.name)).toEqual([
      ...builtInAppearanceProfiles.map((profile) => profile.name),
      "Day",
      "Night"
    ]);
    expect(profiles.find((profile) => profile.id === "gone")).toBeUndefined();
  });

  it("reports a profile as modified only when a profile field drifts", () => {
    const base = {
      appearanceProfiles: { night: roundedDark },
      appliedAppearanceProfileId: "night"
    };
    const current = snapshotAppearance({
      ...seedAppearance,
      ...roundedDark.settings
    });
    expect(resolveAppearanceProfilesState(base, current).isModified).toBe(
      false
    );
    expect(
      resolveAppearanceProfilesState(base, {
        ...current,
        appStyle: AppStyle.Boxed
      }).isModified
    ).toBe(true);
  });

  it("reads the shown theme and app style from the live store, not stale preferences", () => {
    const current = resolveCurrentAppearance(
      {
        isSyncWithSystem: false,
        lightColorSchemeId: String(seedAppearance.lightColorSchemeId),
        darkColorSchemeId: String(seedAppearance.darkColorSchemeId),
        userThemeSetting: Theme.DARK,
        appStyle: AppStyle.Boxed
      },
      {
        appearance: {
          ...seedAppearance,
          appStyle: AppStyle.Rounded,
          typeface: "Sen"
        }
      }
    );
    expect(current.appStyle).toBe(AppStyle.Boxed);
    expect(current.userThemeSetting).toBe(Theme.DARK);
    expect(current.typeface).toBe("Sen");
  });

  it("is never modified without an applied profile, or when it was deleted", () => {
    const current = snapshotAppearance({
      ...seedAppearance,
      appStyle: AppStyle.Rounded
    });
    expect(resolveAppearanceProfilesState({}, current).applied).toBeUndefined();
    const deleted = resolveAppearanceProfilesState(
      {
        appearanceProfiles: { night: null },
        appliedAppearanceProfileId: "night"
      },
      current
    );
    expect(deleted.applied).toBeUndefined();
    expect(deleted.isModified).toBe(false);
  });

  it("applies a profile and records it as applied in the same patch, keeping other appearance fields", () => {
    const [profile] = resolveAppearanceProfiles({
      appearanceProfiles: { night: roundedDark }
    }).filter((entry) => !entry.isBuiltIn);
    const patch = resolveApplyProfilePatch(
      { appearance: { ...seedAppearance, isBlurredBgForPopups: true } },
      profile
    );
    expect(patch.appliedAppearanceProfileId).toBe("night");
    expect(patch.appearance).toMatchObject({
      ...roundedDark.settings,
      isBlurredBgForPopups: true
    });
  });

  it("treats legacy numeric scheme ids and a missing app style as equal to their normalized form", () => {
    const stored = snapshotAppearance(seedAppearance);
    expect(
      isAppearanceDifferent(stored, {
        ...stored,
        appStyle: undefined,
        lightColorSchemeId: Number(stored.lightColorSchemeId) as never
      })
    ).toBe(Number.isNaN(Number(stored.lightColorSchemeId)));
  });
});
