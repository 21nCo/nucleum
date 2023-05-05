import type { intervalbar } from "./intervalbar.type";
import type { Preset } from "$lib/local/types/preset.type";
import type { SessionState } from "./sessionState.enum";
import type { SessionType } from "./sessionType.enum";
import type { TaskStatus } from "./taskStatus.enum";

export type SessionStore = {
  currentSessionId: string | undefined;
  previousSessionId: string | undefined;
  currentTaskId: string | null;
  currentTaskWorked?: number;
  currentBarIndex: number;
  currentBarDuration: number;
  isFocusRunning: boolean;
  type: SessionType;
  state: SessionState;
  snapshot?: Snapshot;
  selectedPreset?: Preset;
  plannedDuration: number;
  start?: Date;
  end?: Date;
  timeElapsed: number;
  totalElapsed: number;
  totalExtended: number;
  sessionProgress: number;
};

export type Session = {
  elapsed: number;
  extended: number;
  brek: number;
  focus: number;
  start: number;
  end: number;
  id: string;
  label: string;
  intention: string;
  tasks?: Task[];
};

export type Snapshot = {
  totalFocus: number;
  timeElapsed: number;
  focus: string;
  bars: intervalbar[];
};

export type TimePeriod = {
  day: UserDate;
  focus: number;
  sessions: Session[];
  isEmptyPeriod?: boolean;
  startDate?: UserDate;
  endDate?: UserDate;
};

export type UserDate = {
  day: number;
  month: number;
  year: number;
};

export type Task = {
  id: string;
  label: string;
  estimate: number;
  worked: number;
  checked: boolean;
  tags?: string[];
  sessionId: string;
  order: number;
};
