import { appMenuStore } from "./appMenu/appMenu.store";
import type { IStore } from "../types/data.type";
import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
import { uiState } from "./uiState/uiState.store";
import { keyboardShortcuts } from "$lib/client/components/shortcuts/shortcuts.store";

export const cacheableStores: IStore[] = [
  userPreferences,
  appMenuStore,
  uiState,
  keyboardShortcuts
];
