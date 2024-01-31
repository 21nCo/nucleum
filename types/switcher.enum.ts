export enum SwitcherStyle {
  Default,
  Vertical,
  Horizontal,
  HorizontalAndWraps,
}

export enum PanelSwitcherStyle {
  DEFAULT,
  BAR,
  DOT,
  BAR_WITH_BG,
  TRAIN,
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
