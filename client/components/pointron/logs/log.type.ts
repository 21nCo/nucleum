import type {
  FocusItem,
  FocusLog,
  FocusTask,
  IntervalBlock
} from "$lib/client/types/pointron/session.type";
import type { ICacheableStore } from "$lib/client/types/data.type";
import type { DbRecordBase } from "$lib/client/types/dbrecord.type";
import type { IMarkdown } from "$lib/client/types/memotron/md.type";
import type { TimeScale } from "$lib/client/types/time.type";

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

export type PointSessionDbType = DbRecordBase &
  SessionBase & {
    elapsed: number;
    extended: number;
    start: number | string;
    end: number | string;
    id: string;
    tasks?: FocusTask[] | FocusItem[];
    manualEntryId?: string;
    notes: IMarkdown;
  };

export type PointLogDbType = DbRecordBase & {
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

export interface PointLogStore extends ICacheableStore {
  manualLogs: IManualSessionLogForm[];
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

export interface LogsPaneStore extends ICacheableStore {
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
