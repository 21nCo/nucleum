import { get } from "svelte/store";
import type { UserGlobalPreferences } from "../types/preferences.type";
import { AppTheme, ColorStrength } from "../types/theme.type";
import { userPreferences } from "../stores/app.store";

export function assignSatAndLight(
  userPreferences: UserGlobalPreferences,
  selectableColorParams: any
) {
  let saturation;
  let lightness;
  if (!userPreferences || !selectableColorParams) return;
  if (userPreferences.colorScheme.isDark) {
    saturation = selectableColorParams.darkSaturation;
    lightness = selectableColorParams.darkLightness;
  } else {
    saturation = selectableColorParams.lightSaturation;
    lightness = selectableColorParams.lightLightness;
  }
  return { saturation, lightness };
}

export function borderColor(
  theme: string,
  colorStrength: ColorStrength = ColorStrength.Normal
) {
  if (theme === AppTheme.Glassy) return "border-none";
  switch (colorStrength) {
    case ColorStrength.Subtle:
      return "border-brs1";
    case ColorStrength.Normal:
      return "border-brs2";
    case ColorStrength.Strong:
      return "border-brs3";
    default:
      return "border-brs2";
  }
}

export function bg(
  theme: string,
  parentBackgroundIndex: number = 1,
  isActive: boolean = false
) {
  const colors = generateBackgroudColor(parentBackgroundIndex);
  return theme === AppTheme.Glassy
    ? isActive
      ? "glassactive"
      : "glass"
    : isActive
    ? colors.activeBackgroundColor
    : colors.backgroundColor;
}

export function generateBackgroudColor(parentBackgroundIndex: number = 1) {
  let activeBackgroundColor;
  let backgroundColor;
  let activeBackgroundColorHex;
  let backgroundColorHex;
  let currentColors = retrieveCurrentColors(get(userPreferences));
  if (parentBackgroundIndex === 1) {
    activeBackgroundColor = "bg-bgs3";
    activeBackgroundColorHex = currentColors?.bgs3;
    backgroundColor = "bg-bgs2";
    backgroundColorHex = currentColors?.bgs2;
  } else if (parentBackgroundIndex === 2) {
    activeBackgroundColor = "bg-bgs4";
    activeBackgroundColorHex = currentColors?.bgs4;
    backgroundColor = "bg-bgs3";
    backgroundColorHex = currentColors?.bgs3;
  } else if (parentBackgroundIndex === 3) {
    activeBackgroundColor = "bg-bgs4";
    activeBackgroundColorHex = currentColors?.bgs4;
    backgroundColor = "bg-bgs4";
    backgroundColorHex = currentColors?.bgs4;
  } else {
    activeBackgroundColor = "bg-bgs2";
    activeBackgroundColorHex = currentColors?.bgs2;
    backgroundColor = "bg-bgs1";
    backgroundColorHex = currentColors?.bgs1;
  }
  return {
    activeBackgroundColor,
    backgroundColor,
    activeBackgroundColorHex,
    backgroundColorHex,
  };
}

export function retrieveCurrentColors(userPreferences: UserGlobalPreferences) {
  let colorScheme = userPreferences.colorScheme?.colors;
  return colorScheme;
}
