import { appMenuStore } from "../layout/leftPanel/appMenu.store";
import type { IStore } from "../types/data.type";
import { userPreferences } from "./app.store";
import { uiState } from "./uiState.store";
import { keyboardShortcuts } from "$lib/client/components/shortcuts/shortcuts.store";

export const cacheableStores: IStore[] = [
  userPreferences,
  appMenuStore,
  uiState,
  keyboardShortcuts
];
