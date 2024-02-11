import { get } from "svelte/store";
import type { UserGlobalPreferences } from "../types/preferences.type";
import {
  AppTheme,
  ColorStrength,
  ColorType,
  type ColorSchemeSLValues
} from "../types/theme.type";
import { appConstants, userPreferences } from "../stores/app.store";

export function resolveSaturationAndLightness(
  userPreferences: UserGlobalPreferences,
  sLConfig: ColorSchemeSLValues[]
) {
  let saturation = 75;
  let lightness = 55;
  if (!userPreferences || !sLConfig || !userPreferences.colorScheme)
    return { saturation, lightness };
  let config = sLConfig.find(
    (x: ColorSchemeSLValues) => x.colorScheme === userPreferences.colorScheme.id
  );
  if (config) {
    saturation = config.saturation;
    lightness = config.lightness;
  }
  return { saturation, lightness };
}
export function retrieveCurrentColors(userPreferences: UserGlobalPreferences) {
  let colorScheme = userPreferences.colorScheme.colors;
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
    case ColorType.Fill:
      return `fill: ${color};`;
    default:
      return ``;
  }
}

export function customColorShade(
  userPreferences: UserGlobalPreferences,
  fallback: string,
  hue: number | null | undefined = undefined,
  shade: number = 1
) {
  let alpha = 0.3;
  if (shade === 1) {
    alpha = userPreferences.colorScheme.isDark ? 0.35 : 0.15;
  } else if (shade === 2) {
    alpha = userPreferences.colorScheme.isDark ? 0.5 : 0.3;
  }
  let color: string;
  const currentColors = retrieveCurrentColors(userPreferences);
  if (hue === undefined || hue === null || typeof hue !== "number") {
    color = currentColors[fallback];
  } else {
    let saturation: number = 50;
    let lightness: number = 50;
    let values = resolveSaturationAndLightness(
      userPreferences,
      appConstants.colorSchemeSLConfig
    );
    if (values) {
      saturation = values.saturation;
      lightness = values.lightness;
    }
    color = `hsl(${hue} ${saturation}% ${lightness}% / ${alpha})`;
  }
  return color;
}

export function customColor(
  userPreferences: UserGlobalPreferences,
  fallback: string,
  hue: number | null | undefined = undefined
) {
  let color: string;
  const currentColors = retrieveCurrentColors(userPreferences);
  if (hue === undefined || hue === null || typeof hue !== "number") {
    color = currentColors[fallback];
  } else {
    let saturation: number = 50;
    let lightness: number = 50;
    let values = resolveSaturationAndLightness(
      userPreferences,
      appConstants.colorSchemeSLConfig
    );
    if (values) {
      saturation = values.saturation;
      lightness = values.lightness;
    }
    color = `hsl(${hue} ${saturation}% ${lightness}%)`;
  }
  return color;
}

export function customColorStyle(
  userPreferences: UserGlobalPreferences,
  colorType: ColorType[] | ColorType,
  fallback: string,
  hue: number | null | undefined = undefined
) {
  let style: string = "";
  const color = customColor(userPreferences, fallback, hue);
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
  // if (theme === AppTheme.Glassy) return "border-none";
  switch (colorStrength) {
    case ColorStrength.Subtle:
      return "border-brs1";
    case ColorStrength.Normal:
      return "border-brs2";
    case ColorStrength.Strong:
      return "border-brs3";
    case ColorStrength.ExtraStrong:
      return "border-brs4";
    default:
      return "border-brs2";
  }
}

export function bgClass(
  theme: string,
  parentBackgroundIndex: number = 1,
  isActive: boolean = false
) {
  const colors = resolveBackgroundClass(parentBackgroundIndex);
  let result = "";
  if (theme === AppTheme.Glassy) {
    result = isActive ? "glassactive" : "glass";
  } else {
    result = isActive ? colors.activeBackgroundColor : colors.backgroundColor;
  }
  return result;
}

export function textColorClass(
  userPreferences: UserGlobalPreferences,
  textColorStrength: ColorStrength = ColorStrength.Normal,
  isAccentBgActive: boolean = false,
  bgColorHue: number | undefined
) {
  const isActiveFgFg = resolveIfActiveFgFg(bgColorHue, userPreferences);
  if ((isAccentBgActive && isActiveFgFg) || !isAccentBgActive) {
    switch (textColorStrength) {
      case ColorStrength.ExtraSubtle:
        return "text-fgs3";
      case ColorStrength.Subtle:
        return "text-fgs2";
      case ColorStrength.Normal:
        return "text-fgs1";
      case ColorStrength.Strong:
        return "text-fgs1";
      case ColorStrength.ExtraStrong:
        return "text-fgs1";
      default:
        return "text-fgs2";
    }
  } else {
    switch (textColorStrength) {
      case ColorStrength.ExtraSubtle:
        return "text-bgs3";
      case ColorStrength.Subtle:
        return "text-bgs2";
      case ColorStrength.Normal:
        return "text-bgs1";
      case ColorStrength.Strong:
        return "text-bgs1";
      case ColorStrength.ExtraStrong:
        return "text-bgs1";
      default:
        return "text-bgs2";
    }
  }
}

export function bgfgClasses(
  userPreferences: UserGlobalPreferences,
  parentBackgroundIndex: number = 1,
  isActive: boolean = false,
  textColorStrength: ColorStrength = ColorStrength.Normal,
  bgColorHue: number | undefined
) {
  const background = bgClass(
    userPreferences.theme,
    parentBackgroundIndex,
    isActive
  );
  const foreground = textColorClass(
    userPreferences,
    textColorStrength,
    isActive,
    bgColorHue
  );
  return `${background} ${foreground}`;
}

export function resolveBackgroundClass(parentBackgroundIndex: number = 1) {
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
    backgroundColorHex
  };
}
/**
 * Determines if the foreground color of text or icons should be Fg shades or not
 * @param bgColorHue 0-360 for custom hue or -1 for default bg of the app or undefined if the custom color is not present
 * @param userPreferences user preferences
 * @returns true if the foreground color of text or icons should be Fg shades or not
 */
export function resolveIfActiveFgFg(
  bgColorHue: number | undefined,
  userPreferences: UserGlobalPreferences
) {
  if (
    "isNeverFgFg" in userPreferences.colorScheme &&
    userPreferences.colorScheme.isNeverFgFg
  ) {
    return false;
  } else if (bgColorHue === -1 || !bgColorHue) {
    return userPreferences.colorScheme.isActiveFgFg;
  } else if (bgColorHue >= 45 && bgColorHue <= 180) {
    return !userPreferences.colorScheme.isDark;
  } else {
    return userPreferences.colorScheme.isDark;
  }
}

export function heatMapColorRange(
  userPreferences: UserGlobalPreferences,
  fallback: string,
  numberOfColors: number,
  hue: number | undefined = undefined
) {
  let colors: string[];
  let saturation: number = 50;
  let lightness: number = 50;
  const currentColors = retrieveCurrentColors(userPreferences);
  if (hue === undefined || hue === null || typeof hue !== "number") {
    const color = currentColors[fallback];
    hue = color.split(" ")[0].split("(")[1];
    saturation = color.split(" ")[1].split("%")[0];
    lightness = color.split(" ")[2].split("%")[0];
  } else {
    let values = resolveSaturationAndLightness(
      userPreferences,
      appConstants.colorSchemeSLConfig
    );
    if (values) {
      saturation = values.saturation;
      lightness = values.lightness;
    }
  }
  console.log({ hue });
  colors = Array.from({ length: numberOfColors }, (_, i) => {
    const s = +saturation - i * (userPreferences.colorScheme.isDark ? 4 : 8);
    const l = +lightness + i * (userPreferences.colorScheme.isDark ? 4 : 6);
    return `hsl(${hue} ${s}% ${l}%)`;
  });
  colors.push(currentColors["bgs2"]);
  return colors.reverse();
}
