import { appMenuStore } from "../layout/leftPanel/appMenu.store";
import type { IStore } from "../types/data.type";
import { dboVersion, userPreferences } from "./app.store";
import { uiState } from "./uiState.store";

export const cacheableStores: IStore[] = [
  userPreferences,
  dboVersion,
  appMenuStore,
  uiState
];
