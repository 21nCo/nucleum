export type IUIStateStore = {
  [key: string]: any;
  $local: {
    [key: string]: any;
  };
};

export enum UIState {
  isOnboardingComplete = "isOnboardingComplete",
  /**
   * Minimizes the left app navigation bar
   */
  isInThinMode = "isInThinMode",
  isHideLeftNavBar = "isHideLeftNavBar",
  hideShortcutHints = "hideShortcutHints",
  /**
   * Completely hides the left app navigation bar on hot key shortcut or minimize toggle
   */
  completelyHideLeftNavBar = "completelyHideLeftNavBar",
  /**
   * Hides the labels in the app menu items
   */
  hideLeftNavMenuLabels = "hideLeftNavMenuLabels",
  arrangement = "arrangement",
  universalPropertyRecents = "universalPropertyRecents",

  //Nucleus
  nucleusOverviewPanel = "nucleusOverviewPanel",

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
  goalPanelSelection = "goalPanelSelection",
  //Memotron
  /**
   * List of recently used capture shortcuts on capture page
   */
  captureShortcutRecents = "captureShortcutRecents",
  /**
   * Whether to open nodes upon save in capture
   */
  openNodesUponSave = "openNodesUponSave",
  memotronOverviewPanel = "memotronOverviewPanel",
  calendarLayout = "calendarLayout",
  classicCalendarScale = "classicCalendarScale",
  classicCalendarColumnWidth = "classicCalendarColumnWidth",
  calendarColumnPanel = "calendarColumnPanel",
  calendarHistoryTab = "calendarHistoryTab",
  calendarDayTimelineScale = "calendarDayTimelineScale",
  calendarDayTimelinePanelSelection = "calendarDayTimelinePanelSelection",
  showCompletedTasks = "showCompletedTasks",
  taskLibraryFiltersExpanded = "taskLibraryFiltersExpanded",
  taskLibrarySelectedSubType = "taskLibrarySelectedSubType",
  analyticsChartStandaloneShowOptions = "analyticsChartStandaloneShowOptions"
}

export enum UIStateScope {
  DEFAULT = "DEFAULT",
  PRODUCT = "PRODUCT",
  DEVICE = "DEVICE",
  /**
   * Unique to a given device access point. This will be useful to store state per access point enabling flows like having bigger and smaller screens within desktop device type.
   */
  DAP = "DAP"
}

export type IUIStateParams = {
  scope?: UIStateScope;
  /**
   * sub variables to further scope the state along with key and main scope.
   */
  subVariables?: string[];
  /**
   * @deprecated - use scope instead
   */
  isProductScoped?: boolean;
  /**
   * @deprecated - use scope instead
   */
  isDeviceScoped?: boolean;
};
