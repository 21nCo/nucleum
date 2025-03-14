import type {
  IFocusItem,
  ISessionInterval
} from "$lib/client/types/pointron/session.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import type { TimeScale } from "$lib/client/types/time.type";
import type { IResource } from "$lib/client/components/flux/resourceStores/resource.type";
import type { IMemotronItemBase } from "../../memotron/memotron.type";
import type { IGoal } from "$lib/client/components/goals/goal.type";
import type { ITask } from "$lib/client/components/tasks/task.type";

export enum SessionType {
  PREDEFINED_INTERVALS = "PREDEFINED_INTERVALS",
  COUNTDOWN = "COUNTDOWN",
  COUNTUP = "COUNTUP",
  MANUAL_ENTRY = "MANUAL_ENTRY"
}

export type ISessionBase = IMemotronItemBase & {
  type: SessionType;
  //TODO - check the need for below
  // logs: FocusLog[];
  blocks: ISessionInterval[];
  elapsed: number;
  extended: number;
};

export type ISession = ISessionBase & {
  elapsed: number;
  extended: number;
  start: number | string;
  end: number | string;
  plannedEnd?: number | string;
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

export type ISessionLog = IResource & {
  start: string;
  end: string;
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

export type ISessionLogThumb = ISessionLog & {
  goal: IGoal;
  session: ISession;
};

export interface ISessionLogStore extends IObservableStoreSubject {
  manualLogs: IManualSessionLogForm[];
  manualLogError?: string;
}

export type IManualSessionLogForm = {
  id: string;
  startTime: string;
  startDate: Date;
  endTime: string;
  endDate: Date;
  goalId: string;
  duration: number;
  notes?: IMarkdown;
};

/**
 * @deprecated - use sessionStore instead
 */
export interface ILogsPaneStore extends IObservableStoreSubject {
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
