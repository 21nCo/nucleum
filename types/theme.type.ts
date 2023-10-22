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
  isExperimental?: boolean;
};

export type ColorSchemeColors = {
  bgs1?: string;
  bgs2?: string;
  bgs3?: string;
  bgs4?: string;
  fgs1?: string;
  fgs2?: string;
  fgs3?: string;
  a1?: string;
  a2?: string;
  a3?: string;
  ar?: string;
  ag?: string;
  bga1s1?: string;
  bga1s2?: string;
  bga2s1?: string;
  bga2s2?: string;
  brs1?: string;
  brs2?: string;
};

export type selectableColorParams = {
  darkSaturation: number;
  darkLightness: number;
  lightSaturation: number;
  lightLightness: number;
};

export enum ColorStrength {
  Subtle = "subtle",
  Normal = "normal",
  Strong = "strong",
  ExtraStrong = "extraStrong",
}
