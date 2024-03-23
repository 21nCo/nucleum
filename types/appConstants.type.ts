import type {
  AppSkin,
  ColorScheme,
  ColorSchemeSLValues
} from "./appearance.type";
export type AppConstants = {
  themes: AppSkin[];
  colorSchemes: ColorScheme[];
  tempColorSchemes: string[];
  colorSchemeSLConfig: ColorSchemeSLValues[];
};
