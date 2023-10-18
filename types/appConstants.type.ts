export type AppConstants = {
  themes: AppTheme[];
  colorSchemes: ColorScheme[];
  tempColorSchemes: string[];
  selectableColorParams: selectableColorParams;
};

export enum AppTheme {
  Clean = "clean",
  Glassy = "glassy",
  Vibrant = "vibrant",
  Futuristic = "futuristic",
}

export type ColorScheme = {
  label: string;
  theme: string;
  isDark: boolean;
  tailwindSelector: string;
  colors: ColorSchemeColors;
};

export type ColorSchemeColors = {
  bgs1?: string;
  bgs2?: string;
  bgs3?: string;
  bgs4?: string;
  fgs1?: string;
  fgs2?: string;
  fgs3?: string;
  accent1?: string;
  accent2?: string;
  accent3?: string;
  red?: string;
  green?: string;
};

export type selectableColorParams = {
  darkSaturation: number;
  darkLightness: number;
  lightSaturation: number;
  lightLightness: number;
};
