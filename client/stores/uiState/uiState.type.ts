export type IUIStateStore = {
  [key: string]: any;
};

export enum UIState {
  isOnboardingComplete = "isOnboardingComplete",
  /**
   * Minimizes the left app navigation bar
   */
  isInThinMode = "isInThinMode",
  isHideLeftNavBar = "isHideLeftNavBar",
  SHOW_MORE_SHORTCUT_HINTS = "SHOW_MORE_SHORTCUT_HINTS",
  /**
   * Completely hides the left app navigation bar on hot key shortcut or minimize toggle
   */
  COMPLETELY_HIDE_LEFT_NAV_BAR = "COMPLETELY_HIDE_LEFT_NAV_BAR",
  arrangement = "arrangement",

  //Pointron
  quickFocusLayout = "quickFocusLayout",
  quickFocusTag = "quickFocusTag",
  focusComposeType = "focusComposeType",
  focusAdvancedComposeMode = "focusAdvancedComposeMode",
  journalYearSelection = "journalYearSelection",
  analyticsPage = "analyticsPage",
  manualLogQuickDuration = "manualLogQuickDuration",
  //Memotron
  /**
   * List of recently used capture shortcuts on capture page
   */
  captureShortcutRecents = "captureShortcutRecents",
  calendarLayout = "calendarLayout",
  calendarScale = "calendarScale",
  classicCalendarColumnWidth = "classicCalendarColumnWidth",
  calendarColumnPanel = "calendarColumnPanel",
  calendarHistoryTab = "calendarHistoryTab"
}
