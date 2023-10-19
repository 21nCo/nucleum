import type {
  AppTheme,
  ColorScheme,
  selectableColorParams,
} from "./theme.type";
export type AppConstants = {
  themes: AppTheme[];
  colorSchemes: ColorScheme[];
  tempColorSchemes: string[];
  selectableColorParams: selectableColorParams;
};
