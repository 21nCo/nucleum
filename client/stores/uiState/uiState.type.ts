export type IUIStateStore = {
  [key: string]: any;
};

export enum UIState {
  isOnboardingComplete = "isOnboardingComplete",
  isInThinMode = "isInThinMode",
  SHOW_MORE_SHORTCUT_HINTS = "SHOW_MORE_SHORTCUT_HINTS",
  arrangement = "arrangement",

  //Pointron
  quickFocusLayout = "quickFocusLayout",
  quickFocusTag = "quickFocusTag",
  focusComposeType = "focusComposeType",
  focusAdvancedComposeMode = "focusAdvancedComposeMode"
}
