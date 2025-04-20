export enum CalendarLayout {
  Classic = "classic",
  Bird = "bird",
  Journal = "journal"
}

export enum CalendarColumnPanel {
  Timeline = "timeline",
  Overview = "overview",
  Notes = "notes",
  /**
   * @deprecated - use {@link CalendarColumnPanel.Timeline} instead
   */
  History = "history",
  /**
   * @deprecated - use {@link CalendarColumnPanel.Timeline} instead
   * Temporary replacement for timeline in Pointron, Memotron until events and time blocking is implemented
   */
  Tasks = "tasks"
}

export enum CalendarHistoryTab {
  ALL = "all",
  FOCUS_SESSIONS = "focus-sessions",
  NODES = "nodes",
  /**
   * @deprecated - use {@link CalendarHistoryTab.ALL} instead
   */
  ACTIVITY = "activity"
}
