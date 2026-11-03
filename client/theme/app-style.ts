/**
 * Shape of the application chrome. Boxed delineates edge-to-edge cells with
 * lines, semi-rounded frames the content in soft panels, and rounded adds
 * pill-shaped controls to that frame.
 */
export enum AppStyle {
  Boxed = "boxed",
  Semi = "semi",
  Rounded = "rounded"
}

/** CSS custom properties that carry the geometry of an app style. */
export type AppStyleTokens = {
  "--app-control-radius": string;
  "--app-panel-radius": string;
  "--app-tab-radius": string;
  "--app-shell-gap": string;
};

const appStyles = new Set<string>(Object.values(AppStyle));

const tokensByStyle: Record<AppStyle, AppStyleTokens> = {
  [AppStyle.Boxed]: {
    "--app-control-radius": "0.375rem",
    "--app-panel-radius": "0px",
    "--app-tab-radius": "0px",
    "--app-shell-gap": "0px"
  },
  [AppStyle.Semi]: {
    "--app-control-radius": "0.375rem",
    "--app-panel-radius": "0.75rem",
    "--app-tab-radius": "0.75rem",
    "--app-shell-gap": "0.5rem"
  },
  [AppStyle.Rounded]: {
    "--app-control-radius": "9999px",
    "--app-panel-radius": "1.75rem",
    "--app-tab-radius": "1.75rem",
    "--app-shell-gap": "0.5rem"
  }
};

/** Narrows a stored value to a known app style, falling back to boxed. */
export function resolveAppStyle(value: unknown): AppStyle {
  return typeof value === "string" && appStyles.has(value)
    ? (value as AppStyle)
    : AppStyle.Boxed;
}

/** Whether the style frames the shell in rounded panels separated by gaps. */
export function isFramedAppStyle(style: AppStyle) {
  return style !== AppStyle.Boxed;
}

/**
 * Resolves the CSS custom properties of an app style. Portrait phones keep the
 * radii but drop the shell gaps so content uses the full width.
 */
export function resolveAppStyleTokens(
  style: AppStyle,
  isPortrait = false
): AppStyleTokens {
  const tokens = tokensByStyle[resolveAppStyle(style)];
  return isPortrait ? { ...tokens, "--app-shell-gap": "0px" } : { ...tokens };
}

/** Serialises app style tokens into an inline style declaration. */
export function formatAppStyleTokens(tokens: AppStyleTokens) {
  return Object.entries(tokens)
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");
}
