export enum SwitcherStyle {
  Default,
  Vertical,
  Horizontal,
  HorizontalAndWraps,
}

export enum PanelSwitcherStyle {
  DEFAULT,
  BOTTOMBAR,
  BOTTOMBAR_MINI,
  BOTTOMDOT,
  BOTTOMBAR_WITHBACKGROUND,
  ROUNDED,
}

export enum SelectionItemActiveStyle {
  UNKNOWN,
  NONE,
  CIRCLE_WITH_BACKGROUND,
  CIRCLE,
  SIDEBAR,
  SIDEDOT,
  BOTTOMDOT,
  BOTTOMBAR,
  ACCENT_BACKGROUND,
  ACCENTROUNDEDBACKGROUND,
  ACCENT_COLOR,
  BG_COLOR,
}

export enum VerticalSwitcherStyle {
  BAR,
  GRADIENT,
  DOT,
  BG,
  BAR_V2,
}

export type SwitchItem = {
  label: string;
  icon?: string;
};
