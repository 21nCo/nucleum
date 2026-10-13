import type { Display } from "@21n/ui/elements/display.enum";

/** Responsive viewport measurements shared by portable UI. */
export type IViewStore = {
  height: number;
  width: number;
  landscapiness: number;
  isPortrait: boolean;
  scale: number;
  display: Display;
  isMinimalTopBar?: boolean;
  firstLoad: number;
  /**
   * Used in cases like not rendering resources with cantilever buttons on small screens and other places throughout the app to check if the screen width is constrained. This is a proxy for Display.CW or Display.MO
   */
  isConstrainedWidth: boolean;
};
