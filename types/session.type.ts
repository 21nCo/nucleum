import type { intervalbar } from "./intervalbar.type";
import type { Preset } from "./preset.type";
import type { SessionState } from "./sessionState.enum";
import type { SessionType } from "./sessionType.enum";
import type { TaskStatus } from "./taskStatus.enum";


export type SessionStore = {
    currentSessionId: string | null,
    currentTaskId: string | null,
    currentTaskWorked?: number;
    todayFocus: number;
    isFocusRunning: boolean;
    //today: Session[],
    //sessions: Session[],
    days: TimePeriod[],
    snapshot?: SessionSnapshot,
    streak: number,
}


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
    id: string;
    label: string;
    estimate: number;
    worked: number;
    checked: boolean;
    tags?: string[];
    sessionId: string;
    order: number;
}

