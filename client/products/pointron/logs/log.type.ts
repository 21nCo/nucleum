import type {
  FocusItem,
  FocusLog,
  FocusTask,
  IntervalBlock
} from "$lib/client/types/pointron/session.type";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import type { TimeScale } from "$lib/client/types/time.type";
import type { IResourceBase } from "$lib/client/components/resourceStores/resource.type";

export enum SessionType {
  PREDEFINED_INTERVALS = "PREDEFINED_INTERVALS",
  COUNTDOWN = "COUNTDOWN",
  COUNTUP = "COUNTUP",
  MANUAL_ENTRY = "MANUAL_ENTRY"
}

export type SessionBase = {
  type: SessionType;
  logs: FocusLog[];
  blocks: IntervalBlock[];
  elapsed: number;
  extended: number;
};

export type IPointSession = IResourceBase &
  SessionBase & {
    elapsed: number;
    extended: number;
    start: number | string;
    end: number | string;
    plannedEnd: number | string;
    id: string;
    tasks?: FocusTask[] | FocusItem[];
    manualEntryId?: string;
    notes: IMarkdown;
  };

export type IPointLog = IResourceBase & {
  start: string;
  end: string;
  sessionId: string;
  taskName?: string;
  totalFocus?: number;
  totalBreak?: number;
  goalId?: string;
  manualEntryId?: string;
  tzOffset?: number;
  targets?: { scale: TimeScale; target: number }[];
};

export interface IPointLogStore extends IObservableStoreSubject {
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
  notes: IMarkdown;
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
};

export type DaySummary = {
  focus: number;
  break: number;
};

export enum LastActionPerformed {
  START_TIME_CHANGED = "START_TIME_CHANGED",
  END_TIME_CHANGED = "END_TIME_CHANGED",
  DURATION_CHANGED = "DURATION_CHANGED",
}