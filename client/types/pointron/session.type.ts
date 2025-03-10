import type { SessionComposition } from "$lib/client/types/pointron/sessionComposition.type";
import type { SessionState } from "./sessionState.enum";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type { SessionType } from "$lib/client/products/pointron/logs/log.type";

export type IActiveSessionStore = IObservableStoreSubject & {
  currentSessionId: IRecordId | undefined;
  type: SessionType;
  state: SessionState;
  composition: SessionComposition;
  isQuickStartOn: boolean;
  plannedDuration: number;
  start?: Date;
  end?: Date;
  timeElapsed: number;
  totalElapsed: number;
  totalExtended: number;
  totalIdle: number;
  intervals: ISessionInterval[];
  currentBlockId: string;
  currentFocusItem?: ICurrentFocusItem;
  currentIdle: number;
  isSessionRunning: boolean;
  preventSliderReverseEventTemp?: boolean;
  widgetSnapshot?: any;
  timeRemainingToTakeBreak?: number;
  notes?: IMarkdown;
};

export type ICurrentFocusItem = {
  start: number;
  id: IRecordId;
};

export type FocusLog = {
  start: number;
  end?: number;
  previousWorked?: number;
  goalId?: string;
  taskId?: string;
  taskName?: string;
  color?: number;
  blocks?: ISessionInterval[];
  sessionId?: string;
  totalFocus?: number;
  totalBreak?: number;
  id?: string | number;
};

export enum SessionBlockType {
  FOCUS = "FOCUS",
  BREAK = "BREAK",
  IDLE = "IDLE"
}
/**
 * @deprecated - Used with older version of Pointron
 */
export type FocusTask = {
  id: string;
  label: string;
  estimate: number;
  worked: number;
  checked: boolean;
  tags?: string[];
  sessionId: string;
  order: number;
};

export type CurrentBlock = {
  duration: number;
  type: BlockType;
  start: number;
  index: number;
};

export type ISessionInterval = {
  id: string;
  type: BlockType;
  duration: number;
  start: number;
  progress: number;
  color?: string;
};

export enum BlockType {
  BREAK,
  FOCUS,
  NONE
}

export type IFocusItem = {
  id: IRecordId;
  blocks?: {
    start: number;
    end: number;
  }[];
  tasks?: IRecordId[];
};

/**
 * @deprecated - use {@link IFocusItem} instead
 */
export type IFocusGoal = IFocusItem & {
  tasks?: IRecordId[];
};

/**
 * @deprecated - use {@link IFocusItem} instead
 */
export type IFocusTask = IFocusItem & {};

export enum SessionUIContext {
  DEFAULT = "DEFAULT",
  ZEN_ON_DESKTOP = "ZEN_ON_DESKTOP",
  THIN_ON_DESKTOP = "THIN_ON_DESKTOP",
  FOCUS_PLAYER = "FOCUS_PLAYER",
  PIP = "PIP"
}

export interface IFocusItemsStore extends IObservableStoreSubject {
  /**
   * @deprecated - use items instead
   */
  goals?: IFocusGoal[];
  /**
   * @deprecated - use items instead
   */
  tasks?: IFocusTask[];
  items: IFocusItem[];
  refreshId: number;
}
