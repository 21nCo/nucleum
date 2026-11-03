import type { AppSkin, Theme, ColorScheme } from "@21n/theme/appearance.type";
import type { AppStyle } from "@21n/theme/app-style";

import type { IStore } from "@nucleum/datafn/observable-store.type";

export type AppearanceStore = Omit<IStore, "get"> & {
  get?: IStore["get"];
  /**
   * @deprecated Use userPreferences.appearance.skin directly instead
   */
  skin?: AppSkin;
  theme: Theme;
  colorScheme: ColorScheme;
  lightColorSchemeId: string;
  darkColorSchemeId: string;
  userThemeSetting: Theme;
  isSyncWithSystem: boolean;
  systemTheme: Theme;
  /** Shape of the application chrome; boxed when absent. */
  appStyle?: AppStyle;
  /**
   * @deprecated Use userPreferences.appearance?.typeface directly instead
   */
  typeface?: string;
  /**
   * @deprecated Use userPreferences.accessibilitySizingFactor directly instead
   */
  accessibilitySizingFactor: number;
};
