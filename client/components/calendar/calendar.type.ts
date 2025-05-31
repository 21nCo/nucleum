import type {
  MetaResource,
  Resource
} from "../flux/resourceStores/resource.enum";

export enum CalendarLayout {
  Classic = "classic",
  Bird = "bird"
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

export enum CalendarExpansionMode {
  /**
   * Journal will expand i.e. overview, notes will be on the right and will take the available width when width is large
   */
  JOURNAL = "journal",
  /**
   * Timeline will expand i.e. timeline will take the available width when width is large gradually becoming horizontal sub splits from vertical subs stack
   */
  TIMELINE = "timeline"
}

export enum CalendarColumnLayout {
  /**
   * Timeline or overview expands to take full width
   */
  FULL = "full",
  /**
   * Timeline will be separated from rest of the panels
   */
  SPLIT = "split",
  /**
   * All column panels will be shown as tabs
   */
  TABS = "tabs"
}

export type CalendarTimelineEntry = {
  startUnix: number;
  endUnix: number;
  item: any;
  component?: string;
};

export type ICalendarIndicatorData = {
  resource: Resource | MetaResource;
  data: any[];
  color?: string;
};
