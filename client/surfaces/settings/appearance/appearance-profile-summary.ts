import { AppStyle } from "@21n/theme/app-style";

/** Display names of the app styles, as the Appearance settings label them. */
export const APP_STYLE_LABELS: Record<AppStyle, string> = {
  [AppStyle.Boxed]: "Boxed",
  [AppStyle.Semi]: "Semi-rounded",
  [AppStyle.Rounded]: "Rounded"
};

function capitalise(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Summarises an appearance profile for its card: the colour scheme (one name
 * when light and dark share it, otherwise "Light / Dark"), the shape and the
 * typeface, joined with a middle dot. Missing parts are left out.
 */
export function resolveAppearanceProfileSummary(parts: {
  lightLabel?: string;
  darkLabel?: string;
  appStyle?: AppStyle;
  typeface?: string;
}): string {
  const light = parts.lightLabel ? capitalise(parts.lightLabel) : undefined;
  const dark = parts.darkLabel ? capitalise(parts.darkLabel) : undefined;
  const scheme =
    light && dark && light !== dark ? `${light} / ${dark}` : (light ?? dark);
  return [
    scheme,
    parts.appStyle ? APP_STYLE_LABELS[parts.appStyle] : undefined,
    parts.typeface
  ]
    .filter(Boolean)
    .join(" · ");
}
