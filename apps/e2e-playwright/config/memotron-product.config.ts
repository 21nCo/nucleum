/**
 * Memotron product config for E2E. Mirrors client/products/product.config.ts for Memotron
 * so tests use home path and app menu labels instead of hardcoding.
 */
export const memotronProductConfig = {
  homePath: "calendar",
  /** Nav labels shown in the app menu (left nav). Order: Capture first (node_create), then Calendar, Overview, Library. */
  appMenuNavLabels: ["Capture", "Calendar", "Overview", "Library"] as const,
  timelinePageLabel: "Calendar",
  pathByNavLabel: {
    Capture: "/capture",
    Calendar: "/calendar",
    Overview: "/overview",
    Library: "/library",
    Home: "/"
  } as Record<string, string>,
  /** Library section label in Memotron (Memory). */
  librarySectionLabel: "Memory"
} as const;
