/**
 * Nucleus product config for E2E. Mirrors client/products/product.config.ts for Nucleus
 * so tests use home path and app menu labels instead of hardcoding.
 */
export const nucleusProductConfig = {
  homePath: "calendar",
  /** Nav labels shown in the app menu (left nav / tabs). Used for getByRole('button', { name: ... }). */
  appMenuNavLabels: ["Calendar", "Overview", "Library"] as const,
  /** Optional "Home" when in dev (isDev); not always present in prod build. */
  includeHomeInNav: false,
  /** Which nav item contains the timeline view for verifying focus sessions, events, etc. */
  timelinePageLabel: "Calendar",
  /** Path segment or pathname to assert after opening each menu item (action path). */
  pathByNavLabel: {
    Calendar: "/calendar",
    Overview: "/overview",
    Library: "/library",
    Home: "/"
  } as Record<string, string>
} as const;

export type NucleusAppMenuLabel = (typeof nucleusProductConfig.appMenuNavLabels)[number];
