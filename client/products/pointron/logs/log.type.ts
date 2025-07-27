import type {
  IFocusItem,
  ISessionInterval
} from "$lib/client/types/pointron/session.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import type { TimeScale } from "$lib/client/types/time.type";
import type {
  IResource,
  IResourceShareable
} from "$lib/client/components/flux/resourceStores/resource.type";
import type { IGoal } from "$lib/client/components/goals/goal.type";
import type { ITask } from "$lib/client/components/tasks/task.type";

export enum SessionType {
  PREDEFINED_INTERVALS = "PREDEFINED_INTERVALS",
  COUNTDOWN = "COUNTDOWN",
  COUNTUP = "COUNTUP",
  MANUAL_ENTRY = "MANUAL_ENTRY"
}

export type ISessionBase = {
  type: SessionType;
  //TODO - check the need for below
  // logs: FocusLog[];
  blocks: ISessionInterval[];
  elapsed: number;
  extended: number;
  /**
   * @deprecated - older UTC version datetime - use {@link startUnix} instead
   */
  start?: number | string;
  /**
   * @deprecated - older UTC version datetime - use {@link endUnix} instead
   */
  end?: number | string;
  /**
   * The unix timestamp of the start datetime
   */
  startUnix: number;
  /**
   * The unix timestamp of the end datetime
   */
  endUnix: number;
  /**
   * @deprecated - use {@link plannedEndUnix} instead
   */
  plannedEnd?: number | string;
  /**
   * The unix timestamp of the planned end datetime
   */
  plannedEndUnix?: number;
  id: string;
  /**
   * @deprecated
   * Previously used pre v0.82.0
   */
  focusItems?: any;
  /**
   * @deprecated
   * Previously used pre v0.82.0
   */
  goals?: any;
  items: IFocusItem[];
  manualEntryId?: string;
  notes?: IMarkdown;
};

export type ISessionCapture = ISessionBase;

type IResourcePropertiesForSession = IResource & IResourceShareable;
export type ISession = ISessionBase & IResourcePropertiesForSession;

export type ISessionLogBase = {
  /**
   * @deprecated - older UTC version datetime - use {@link startUnix} instead
   */
  start?: string;
  /**
   * The unix timestamp of the start date
   */
  startUnix: number;
  /**
   * @deprecated - older UTC version datetime - use {@link endUnix} instead
   */
  end?: string;
  /**
   * The unix timestamp of the end date
   */
  endUnix: number;
  sessionId: IRecordId;
  /**
   * @deprecated
   */
  taskName?: string;
  focus?: number;
  breakTime?: number;
  goalId?: IRecordId;
  taskId?: IRecordId;
  manualEntryId?: string;
  tzOffset?: number;
  targets?: { scale: TimeScale; target: number }[];
};

export type ISessionLogCapture = ISessionLogBase & {
  id: IRecordId;
};

type IResourcePropertiesForSessionLog = IResource & IResourceShareable;

export type ISessionLog = ISessionLogBase & IResourcePropertiesForSessionLog;

export type ISessionLogThumb = ISessionLog & {
  goal: IGoal;
  session: ISession;
};

export interface IManualLogStore {
  manualLogs: IManualSessionLogForm[];
  manualLogError?: string;
}

export type IManualSessionLogForm = {
  id: string;
  startTime: string;
  startDate: Date;
  endTime: string;
  endDate: Date;
  goalId: IRecordId;
  duration: number;
  notes?: IMarkdown;
};

/**
 * @deprecated - use sessionStore instead
 */
export interface ILogsPaneStore {
  logs: ISessionThumb[];
  summary: DaySummary;
  date: Date;
}

export type ISessionThumb = ISession & {
  expandedItems: (IGoal | ITask)[];
};

export type DaySummary = {
  focus: number;
  break: number;
};

export enum LastActionPerformed {
  START_TIME_CHANGED = "START_TIME_CHANGED",
  END_TIME_CHANGED = "END_TIME_CHANGED",
  DURATION_CHANGED = "DURATION_CHANGED"
}
