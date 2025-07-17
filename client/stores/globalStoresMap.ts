import { appMenuStore } from "./appMenu/appMenu.store";
import type { IStore } from "../types/data.type";
import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
import { uiState } from "./uiState/uiState.store";
import { keyboardShortcuts } from "$lib/client/components/shortcuts/shortcuts.store";
import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
import { preferences } from "./preferences/preferences.store";
export const cacheableStores: IStore[] = [
  userPreferences,
  tzStore,
  appMenuStore,
  uiState,
  keyboardShortcuts,
  preferences
];
