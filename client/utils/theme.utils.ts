import { get } from "svelte/store";
import {
  AppSkin,
  ColorStrength,
  ColorType,
  type ColorSchemeSLValues,
  type AppearanceStore
} from "$lib/client/types/appearance.type";
import { appConstants, userPreferences } from "../stores/app.store";
import appearance from "../stores/appearance.store";

export function resolveSaturationAndLightness(
  appearance: AppearanceStore,
  sLConfig: ColorSchemeSLValues[]
) {
  let saturation = 75;
  let lightness = 55;
  if (!appearance || !sLConfig || !appearance.colorScheme)
    return { saturation, lightness };
  let config = sLConfig.find(
    (x: ColorSchemeSLValues) => x.colorScheme === appearance.colorScheme.id
  );
  if (config) {
    saturation = config.saturation;
    lightness = config.lightness;
  }
  return { saturation, lightness };
}
export function retrieveCurrentColors(appearance: AppearanceStore) {
  let colorScheme = appearance.colorScheme.colors;
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

/**
 * @deprecated use CustomColorPropagator.svelte or {@link generateCustomColorShade} instead
 * @param appearance
 * @param fallback
 * @param hue
 * @param shade
 * @returns
 */
export function customColorShade(
  appearance: AppearanceStore,
  fallback: string,
  hue: number | null | undefined = undefined,
  shade: number = 1
) {
  let alpha = 0.3;
  if (shade === 1) {
    alpha = appearance.colorScheme.isDark ? 0.35 : 0.15;
  } else if (shade === 2) {
    alpha = appearance.colorScheme.isDark ? 0.5 : 0.3;
  } else if (shade === 0) {
    alpha = 1;
  }
  let color: string;
  const currentColors = retrieveCurrentColors(appearance);
  if (hue === undefined || hue === null || typeof hue !== "number") {
    color = currentColors[fallback];
  } else {
    let saturation: number = 50;
    let lightness: number = 50;
    let values = resolveSaturationAndLightness(
      appearance,
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

export function generateCustomColorShade(
  appearance: AppearanceStore,
  hue: number,
  shade: number = 1
) {
  let color: string;
  let saturation: number = 50;
  let lightness: number = 50;
  let values = resolveSaturationAndLightness(
    appearance,
    appConstants.colorSchemeSLConfig
  );
  if (values) {
    saturation = values.saturation;
    lightness = values.lightness;
  }
  if (shade === 1) {
    lightness = appearance.colorScheme.isDark ? 10 : 98;
  } else if (shade === 2) {
    lightness = appearance.colorScheme.isDark ? 15 : 90;
  } else if (shade === 3) {
    lightness = appearance.colorScheme.isDark ? 20 : 85;
  } else if (shade === 4) {
    lightness = appearance.colorScheme.isDark ? 25 : 80;
  }
  color = `hsl(${hue} ${saturation}% ${lightness}% / 1)`;
  return color;
}

/**
 * Without using alpha - using lightness and saturation
 * @param appearance
 * @param fallback
 * @param hue
 * @param shade
 * @returns
 */
export function generateCustomColorShades(
  appearance: AppearanceStore,
  hue: number
) {
  return [0, 1, 2, 3].map((shade) => {
    return generateCustomColorShade(appearance, hue, shade);
  });
}

/**
 * @deprecated use CustomColorPropagator.svelte or {@link generateCustomColorShade} with shade as 0 instead
 * @param appearance
 * @param fallback
 * @param hue
 * @returns
 */
export function customColor(
  appearance: AppearanceStore,
  fallback: string,
  hue: number | null | undefined = undefined
) {
  let color: string;
  const currentColors = retrieveCurrentColors(appearance);
  if (hue === undefined || hue === null || typeof hue !== "number") {
    color = currentColors[fallback];
  } else {
    let saturation: number = 50;
    let lightness: number = 50;
    let values = resolveSaturationAndLightness(
      appearance,
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
  appearance: AppearanceStore,
  colorType: ColorType[] | ColorType,
  fallback: string,
  hue: number | null | undefined = undefined
) {
  let style: string = "";
  const color = customColor(appearance, fallback, hue);
  if (colorType instanceof Array) {
    colorType.forEach((colorType) => {
      style += cssStyle(color, colorType);
    });
  } else {
    style = cssStyle(color, colorType);
  }
  return style;
}

export function borderClass(
  appearance: AppearanceStore,
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
  appearance: AppearanceStore,
  parentBackgroundIndex: number = 1,
  isActive: boolean = false
) {
  const colors = resolveBackgroundClass(parentBackgroundIndex);
  let result = "";
  if (appearance.skin === AppSkin.Glassy) {
    result = isActive ? "glassactive" : "glass";
  } else {
    result = isActive ? colors.activeBackgroundColor : colors.backgroundColor;
  }
  return result;
}

export function textColorClass(
  appearance: AppearanceStore,
  textColorStrength: ColorStrength = ColorStrength.Normal,
  isAccentBgActive: boolean = false,
  bgColorHue: number | undefined = undefined
) {
  const isActiveFgFg = resolveIfActiveFgFg(bgColorHue, appearance);
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

export function resolveBackgroundClass(parentBackgroundIndex: number = 1) {
  let activeBackgroundColor;
  let backgroundColor;
  let activeBackgroundColorHex;
  let backgroundColorHex;
  let currentColors = retrieveCurrentColors(get(appearance));
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
 * @param appearance user preferences
 * @returns true if the foreground color of text or icons should be Fg shades or not
 */
export function resolveIfActiveFgFg(
  bgColorHue: number | undefined,
  appearance: AppearanceStore
) {
  if (
    "isNeverFgFg" in appearance.colorScheme &&
    appearance.colorScheme.isNeverFgFg
  ) {
    return false;
  } else if (bgColorHue === -1 || !bgColorHue) {
    return appearance.colorScheme.isActiveFgFg;
  } else if (bgColorHue >= 45 && bgColorHue <= 180) {
    return !appearance.colorScheme.isDark;
  } else {
    return appearance.colorScheme.isDark;
  }
}

export function heatMapColorRange(
  appearance: AppearanceStore,
  fallback: string,
  numberOfColors: number,
  hue: number | undefined = undefined
) {
  let colors: string[];
  let saturation: number = 50;
  let lightness: number = 50;
  const currentColors = retrieveCurrentColors(appearance);
  if (hue === undefined || hue === null || typeof hue !== "number") {
    const color = currentColors[fallback];
    if (!color) return [];
    hue = color.split(" ")[0].split("(")[1];
    saturation = color.split(" ")[1].split("%")[0];
    lightness = color.split(" ")[2].split("%")[0];
  } else {
    let values = resolveSaturationAndLightness(
      appearance,
      appConstants.colorSchemeSLConfig
    );
    if (values) {
      saturation = values.saturation;
      lightness = values.lightness;
    }
  }
  colors = Array.from({ length: numberOfColors }, (_, i) => {
    const s = +saturation - i * (appearance.colorScheme.isDark ? 4 : 8);
    const l = +lightness + i * (appearance.colorScheme.isDark ? 4 : 6);
    return `hsl(${hue} ${s}% ${l}%)`;
  });
  colors.push(currentColors["bgs2"]);
  return colors.reverse();
}
