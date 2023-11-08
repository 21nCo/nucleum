import { get } from "svelte/store";
import type { UserGlobalPreferences } from "../types/preferences.type";
import { AppTheme, ColorStrength, ColorType } from "../types/theme.type";
import { appStore, defaultColors, userPreferences } from "../stores/app.store";

export function assignSatAndLight(
  userPreferences: UserGlobalPreferences,
  selectableColorParams: any
) {
  //console.log("assignSatAndLight", { userPreferences, selectableColorParams });
  let saturation;
  let lightness;
  if (
    !userPreferences ||
    !selectableColorParams ||
    !userPreferences.colorScheme
  )
    return;
  if (userPreferences.colorScheme.isDark) {
    saturation = selectableColorParams.darkSaturation;
    lightness = selectableColorParams.darkLightness;
  } else {
    saturation = selectableColorParams.lightSaturation;
    lightness = selectableColorParams.lightLightness;
  }
  return { saturation, lightness };
}
export function retrieveCurrentColors(userPreferences: UserGlobalPreferences) {
  let colorScheme = userPreferences.colorScheme?.colors ?? defaultColors;
  return colorScheme;
}

function cssStyle(color: string, colorType: ColorType) {
  switch (colorType) {
    case ColorType.Bg:
      return `background-color: ${color};`;
    case ColorType.Fg:
      return `color: ${color};`;
    case ColorType.Outline:
      return `outline-color: ${color};`;
    case ColorType.Border:
      return `border-color: ${color};`;
    default:
      return `background-color: ${color};`;
  }
}
export function customColor(
  userPreferences: UserGlobalPreferences,
  colorType: ColorType[] | ColorType,
  fallback: string,
  hue: number | null | undefined = undefined
) {
  let style: string = "";
  let color: string;
  const currentColors = retrieveCurrentColors(userPreferences);
  if (hue === undefined || hue === null || typeof hue !== "number") {
    color = currentColors?.[fallback] ?? defaultColors[fallback];
  } else {
    let saturation: number = 50;
    let lightness: number = 50;
    let values = assignSatAndLight(
      userPreferences,
      get(appStore).appConstants.selectableColorParams
    );
    if (values) {
      saturation = values.saturation;
      lightness = values.lightness;
    }
    color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  if (colorType instanceof Array) {
    colorType.forEach((colorType) => {
      style += cssStyle(color, colorType);
    });
  } else {
    style = cssStyle(color, colorType);
  }
  return style;
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
