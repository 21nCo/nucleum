/**
 * Pointron product config for E2E. Mirrors client/products/product.config.ts for Pointron
 * so tests use home path and app menu labels instead of hardcoding.
 */
export const pointronProductConfig = {
  homePath: "calendar",
  /** Nav labels shown in the app menu (left nav). Order: Focus first, then Calendar, Overview, Library. */
  appMenuNavLabels: ["Focus", "Calendar", "Overview", "Library"] as const,
  timelinePageLabel: "Calendar",
  pathByNavLabel: {
    Focus: "/focus",
    Calendar: "/calendar",
    Overview: "/overview",
    Library: "/library",
    Home: "/"
  } as Record<string, string>,
  /** Library section label in Pointron (Focus). */
  librarySectionLabel: "Focus"
} as const;
