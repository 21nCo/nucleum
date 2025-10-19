import type {
  AppSkin,
  ColorScheme,
  ColorSchemeSLValues
} from "@21n/types/appearance.type";
export type AppConstants = {
  themes: AppSkin[];
  colorSchemes: ColorScheme[];
  tempColorSchemes: string[];
  colorSchemeSLConfig: ColorSchemeSLValues[];
};
