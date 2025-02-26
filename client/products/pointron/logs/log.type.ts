import type {
  IFocusGoal,
  FocusLog,
  ISessionInterval,
  IFocusTodo
} from "$lib/client/types/pointron/session.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import type { TimeScale } from "$lib/client/types/time.type";
import type { IResource } from "$lib/client/components/flux/resourceStores/resource.type";
import type { IMemotronItemBase } from "../../memotron/memotron.type";

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
  goals: IFocusGoal[];
  manualEntryId?: string;
  notes: IMarkdown;
};

export type ISessionLog = IResource & {
  start: string;
  end: string;
  sessionId: IRecordId;
  /**
   * @deprecated
   */
  taskName?: string;
  totalFocus?: number;
  totalBreak?: number;
  goalId?: IRecordId;
  todoId?: IRecordId;
  manualEntryId?: string;
  tzOffset?: number;
  targets?: { scale: TimeScale; target: number }[];
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

export interface ILogsPaneStore extends IObservableStoreSubject {
  logs: LogThumbnail[];
  summary: DaySummary;
  date: Date;
}

export type LogThumbnail = {
  id: string;
  start: string;
  end: string;
  totalFocus: number;
  totalBreak: number;
  goals: any;
  tasks: any;
  focusItems: any;
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
