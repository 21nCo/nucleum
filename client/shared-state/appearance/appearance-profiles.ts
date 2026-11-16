import { derived, get } from "svelte/store";
import appearance from "@nucleum/shared-state/appearance/appearance.store";
import type { AppearanceStore } from "@nucleum/shared-state/appearance/appearance.type";
import { resolveAppStyle } from "@21n/theme/app-style";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import {
  seedUserPreferences,
  userPreferences
} from "@nucleum/shared-state/preferences/user-preferences.store";
import type {
  AppearanceProfileSettings,
  IUserGlobalPreferences,
  StoredAppearanceProfile,
  UserAppearanceSettings
} from "@nucleum/shared-state/preferences/user-preferences.type";

/** Id prefix of profiles defined in code rather than stored. */
export const BUILT_IN_APPEARANCE_PROFILE_PREFIX = "builtin:";

/** Command bar action that lists profiles and applies the chosen one. */
export const SWITCH_APPEARANCE_PROFILE_ACTION = "switch-appearance-profile";

/** An appearance profile as shown to the user. */
export type AppearanceProfile = {
  id: string;
  name: string;
  settings: AppearanceProfileSettings;
  isBuiltIn: boolean;
  createdAt?: number;
};

/** Profile list with the applied profile and whether settings drifted from it. */
export type AppearanceProfilesState = {
  profiles: AppearanceProfile[];
  applied: AppearanceProfile | undefined;
  isModified: boolean;
};

/** Captures the profile fields of the given appearance settings. */
export function snapshotAppearance(
  appearance: UserAppearanceSettings
): AppearanceProfileSettings {
  const seed = seedUserPreferences.appearance;
  return {
    isSyncWithSystem: appearance.isSyncWithSystem ?? seed.isSyncWithSystem,
    lightColorSchemeId: String(
      appearance.lightColorSchemeId ?? seed.lightColorSchemeId
    ),
    darkColorSchemeId: String(
      appearance.darkColorSchemeId ?? seed.darkColorSchemeId
    ),
    userThemeSetting: appearance.userThemeSetting ?? seed.userThemeSetting,
    typeface: appearance.typeface ?? seed.typeface,
    appStyle: resolveAppStyle(appearance.appStyle)
  };
}

/** Profiles that ship with the app; they cannot be renamed or deleted. */
export const builtInAppearanceProfiles: AppearanceProfile[] = [
  {
    id: `${BUILT_IN_APPEARANCE_PROFILE_PREFIX}default`,
    name: "Default",
    settings: snapshotAppearance(seedUserPreferences.appearance),
    isBuiltIn: true
  }
];

/** Whether two snapshots differ in any profile field. */
export function isAppearanceDifferent(
  a: AppearanceProfileSettings,
  b: AppearanceProfileSettings
) {
  const left = normalizeSettings(a);
  const right = normalizeSettings(b);
  return (Object.keys(left) as (keyof AppearanceProfileSettings)[]).some(
    (key) => left[key] !== right[key]
  );
}

function normalizeSettings(
  settings: AppearanceProfileSettings
): AppearanceProfileSettings {
  return snapshotAppearance({
    ...seedUserPreferences.appearance,
    ...settings
  });
}

/** Built-in profiles followed by the user's live profiles in creation order. */
export function resolveAppearanceProfiles(
  preferences: Pick<IUserGlobalPreferences, "appearanceProfiles">
): AppearanceProfile[] {
  const stored = Object.entries(preferences.appearanceProfiles ?? {})
    .filter((entry): entry is [string, StoredAppearanceProfile] => !!entry[1])
    .map(([id, profile]) => ({
      id,
      name: profile.name,
      settings: normalizeSettings(profile.settings),
      isBuiltIn: false,
      createdAt: profile.createdAt
    }))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  return [...builtInAppearanceProfiles, ...stored];
}

/**
 * The appearance as currently shown: theme, schemes and app style from the
 * live appearance store, and the typeface from the preferences that apply it.
 */
export function resolveCurrentAppearance(
  live: Pick<
    AppearanceStore,
    | "isSyncWithSystem"
    | "lightColorSchemeId"
    | "darkColorSchemeId"
    | "userThemeSetting"
    | "appStyle"
  >,
  preferences: Pick<IUserGlobalPreferences, "appearance">
): AppearanceProfileSettings {
  return snapshotAppearance({
    ...preferences.appearance,
    isSyncWithSystem: live.isSyncWithSystem,
    lightColorSchemeId: live.lightColorSchemeId,
    darkColorSchemeId: live.darkColorSchemeId,
    userThemeSetting: live.userThemeSetting,
    appStyle: live.appStyle
  });
}

/** Resolves the profile list, the applied profile and whether the current appearance drifted from it. */
export function resolveAppearanceProfilesState(
  preferences: Pick<
    IUserGlobalPreferences,
    "appearanceProfiles" | "appliedAppearanceProfileId"
  >,
  current: AppearanceProfileSettings
): AppearanceProfilesState {
  const profiles = resolveAppearanceProfiles(preferences);
  const applied = profiles.find(
    (profile) => profile.id === preferences.appliedAppearanceProfileId
  );
  const isModified = applied
    ? isAppearanceDifferent(applied.settings, current)
    : false;
  return { profiles, applied, isModified };
}

/** Preference patch that applies a profile's settings and records it as applied in one write. */
export function resolveApplyProfilePatch(
  preferences: Pick<IUserGlobalPreferences, "appearance">,
  profile: AppearanceProfile
): Partial<IUserGlobalPreferences> {
  return {
    appearance: { ...preferences.appearance, ...profile.settings },
    appliedAppearanceProfileId: profile.id
  };
}

/**
 * Preference patch that writes one stored profile entry. Profiles are written
 * as the whole `appearanceProfiles` map, so sync merges them map-level: the
 * patch carries the latest local map with only this entry changed.
 */
export function resolveProfileEntryPatch(
  preferences: Pick<IUserGlobalPreferences, "appearanceProfiles">,
  id: string,
  profile: StoredAppearanceProfile | null
): Partial<IUserGlobalPreferences> {
  return {
    appearanceProfiles: { ...preferences.appearanceProfiles, [id]: profile }
  };
}

/** Preference patch that saves settings as a new user profile and marks it applied. */
export function resolveSaveProfilePatch(
  preferences: Pick<IUserGlobalPreferences, "appearanceProfiles">,
  id: string,
  name: string,
  settings: AppearanceProfileSettings,
  createdAt: number
): Partial<IUserGlobalPreferences> {
  return {
    ...resolveProfileEntryPatch(preferences, id, {
      name: name.trim() || "Untitled profile",
      settings,
      createdAt
    }),
    appliedAppearanceProfileId: id
  };
}

/** Preference patch that tombstones a user profile and clears it if applied. */
export function resolveDeleteProfilePatch(
  preferences: Pick<
    IUserGlobalPreferences,
    "appearanceProfiles" | "appliedAppearanceProfileId"
  >,
  id: string
): Partial<IUserGlobalPreferences> {
  return {
    ...resolveProfileEntryPatch(preferences, id, null),
    ...(preferences.appliedAppearanceProfileId === id
      ? { appliedAppearanceProfileId: null }
      : {})
  };
}

/** Live profile state derived from the synced preferences and the shown appearance. */
export const appearanceProfiles = derived(
  [userPreferences, appearance],
  ([$preferences, $appearance]) =>
    resolveAppearanceProfilesState(
      $preferences,
      resolveCurrentAppearance($appearance, $preferences)
    )
);

function currentAppearance() {
  return resolveCurrentAppearance(get(appearance), userPreferences.get());
}

function storedProfiles() {
  return userPreferences.get().appearanceProfiles ?? {};
}

function findProfile(id: string) {
  return resolveAppearanceProfiles(userPreferences.get()).find(
    (profile) => profile.id === id
  );
}

function writeProfile(id: string, profile: StoredAppearanceProfile | null) {
  return userPreferences.modify(
    resolveProfileEntryPatch(userPreferences.get(), id, profile)
  );
}

/** Applies a profile to the current appearance. */
export function applyAppearanceProfile(id: string) {
  const profile = findProfile(id);
  if (!profile) return;
  return userPreferences.modify(
    resolveApplyProfilePatch(userPreferences.get(), profile)
  );
}

/** Saves the current appearance as a new user profile and marks it applied. */
export function saveAppearanceProfileAsNew(name: string) {
  return userPreferences.modify(
    resolveSaveProfilePatch(
      userPreferences.get(),
      generateSimpleRandomId(),
      name,
      currentAppearance(),
      Date.now()
    )
  );
}

/** Overwrites a user profile with the current appearance. */
export function updateAppearanceProfile(id: string) {
  const stored = storedProfiles()[id];
  if (!stored) return;
  return writeProfile(id, {
    ...stored,
    settings: currentAppearance()
  });
}

/** Renames a user profile. */
export function renameAppearanceProfile(id: string, name: string) {
  const stored = storedProfiles()[id];
  const trimmed = name.trim();
  if (!stored || !trimmed) return;
  return writeProfile(id, { ...stored, name: trimmed });
}

/** Deletes a user profile, keeping a tombstone, and clears it if applied. */
export function deleteAppearanceProfile(id: string) {
  if (!storedProfiles()[id]) return;
  return userPreferences.modify(
    resolveDeleteProfilePatch(userPreferences.get(), id)
  );
}
