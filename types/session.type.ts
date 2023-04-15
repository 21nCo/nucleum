import type { intervalbar } from "./intervalbar.type";
import type { Preset } from "./preset.type";
import type { SessionState } from "./sessionState.enum";
import type { SessionType } from "./sessionType.enum";
import type { TaskStatus } from "./taskStatus.enum";


export type SessionStore = {
    currentSessionId: number,
    todayFocus: number;
    isFocusRunning: boolean;
    //today: Session[],
    //sessions: Session[],
    days: TimePeriod[],
    currentTasks?: Task[],
    snapshot?: SessionSnapshot,
    streak: number,
    currentTask?: string
}


export type Session = {
    elapsed: number;
    extended: number;
    brek: number;
    focus: number;
    start: number;
    end: number;
    id: number;
    intention: string;
    tasks?: Task[];
}

export type SessionSnapshot = {
    sessionState: SessionState;
    sessionType: SessionType;
    sessionProgress: number;
    totalElapsed: number;
    totalFocus: number;
    timeElapsed: number;
    focus: string;
    currentBarIndex: number;
    currentBarDuration: number;
    dynamicDuration: number;
    totalExtended: number;
    selectedPreset: Preset;
    bars: intervalbar[];
    sessionStartTime: Date;
    sessionEndTime: Date;
    tasks: Task[];
    isFocusRunning: boolean;
}

export type TimePeriod = {
    day: UserDate;
    focus: number;
    sessions: Session[];
    isEmptyPeriod?: boolean;
    startDate?: UserDate;
    endDate?: UserDate;
}

export type UserDate = {
    day: number;
    month: number;
    year: number;
}

export type Task = {
    label: string;
    estimate: number;
    worked: number;
    checked: boolean;
    isInprogress?: boolean;
}

