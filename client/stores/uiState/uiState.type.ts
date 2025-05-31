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
  HIDE_SHORTCUT_HINTS = "HIDE_SHORTCUT_HINTS",
  /**
   * Completely hides the left app navigation bar on hot key shortcut or minimize toggle
   */
  COMPLETELY_HIDE_LEFT_NAV_BAR = "COMPLETELY_HIDE_LEFT_NAV_BAR",
  /**
   * Hides the labels in the app menu items
   */
  hideLeftNavMenuLabels = "hideLeftNavMenuLabels",
  arrangement = "arrangement",

  //Pointron
  quickFocusLayout = "quickFocusLayout",
  quickFocusTag = "quickFocusTag",
  focusComposeType = "focusComposeType",
  focusAdvancedComposeMode = "focusAdvancedComposeMode",
  journalYearSelection = "journalYearSelection",
  analyticsPage = "analyticsPage",
  manualLogQuickDuration = "manualLogQuickDuration",
  manualLogRecentGoals = "manualLogRecentGoals",
  manualLogDurationMethod = "manualLogDurationMethod",
  recentFocusItems = "recentFocusItems",
  focusItemsPickFromPanel = "focusItemsPickFromPanel",
  //Memotron
  /**
   * List of recently used capture shortcuts on capture page
   */
  captureShortcutRecents = "captureShortcutRecents",
  memotronOverviewPanel = "memotronOverviewPanel",
  calendarLayout = "calendarLayout",
  calendarScale = "calendarScale",
  classicCalendarColumnWidth = "classicCalendarColumnWidth",
  calendarColumnPanel = "calendarColumnPanel",
  calendarHistoryTab = "calendarHistoryTab",
  calendarDayTimelineScale = "calendarDayTimelineScale",
  calendarDayTimelinePanelSelection = "calendarDayTimelinePanelSelection",
  showCompletedCalendarTasks = "showCompletedCalendarTasks"
}
