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
  isArchived?: boolean;
  isActiveFgFg: boolean;
  isNeverFgFg: boolean;
  id: string;
};

export type ColorSchemeColors = {
  bgs1?: string;
  bgs2?: string;
  bgs3?: string;
  bgs4?: string;
  fgs1?: string;
  fgs2?: string;
  fgs3?: string;
  fgs4?: string;
  a1?: string;
  a2?: string;
  a3?: string;
  ar?: string;
  ag?: string;
  a1s1?: string;
  a1s2?: string;
  a2s1?: string;
  a2s2?: string;
  brs1?: string;
  brs2?: string;
};

export type ColorSchemeSLValues = {
  saturation: number;
  lightness: number;
  alpha?: number;
  colorScheme: string;
};

export enum ColorStrength {
  ExtraSubtle = "extraSubtle",
  Subtle = "subtle",
  Normal = "normal",
  Strong = "strong",
  ExtraStrong = "extraStrong",
}

export enum ColorType {
  None = "none",
  Bg = "background",
  Fg = "foreground",
  Outline = "outline",
  Border = "border",
}
