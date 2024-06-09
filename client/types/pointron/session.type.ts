import type { SessionComposition } from "$lib/client/types/pointron/sessionComposition.type";
import type { SessionState } from "./sessionState.enum";
import type { IMarkdown } from "$lib/client/types/memotron/md.type";
import type { ICacheableStore } from "$lib/client/types/data.type";
import type { SessionType } from "$lib/client/components/pointron/logs/log.type";

export type SessionStore = ICacheableStore & {
  currentSessionId: string | undefined;
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
  sessionProgress: number;
  blocks: IntervalBlock[];
  logs: FocusLog[];
  currentLog: FocusLog;
  currentBlock: CurrentBlock;
  currentIdle: number;
  isSessionRunning: boolean;
  id: string;
  preventSliderReverseEventTemp?: boolean;
  widgetSnapshot?: any;
  timeRemainingToTakeBreak?: number;
  notes: IMarkdown;
};

export type FocusLog = {
  start: number;
  end?: number;
  previousWorked?: number;
  goalId?: string;
  taskId?: string;
  taskName?: string;
  color?: number;
  blocks?: IntervalBlock[];
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

export type IntervalBlock = {
  duration?: number;
  progress?: number;
  color?: string;
  type?: BlockType;
  start?: number;
  end?: number;
};

export enum BlockType {
  BREAK,
  FOCUS
}

export type FocusItem = {
  taskId?: string;
  goalId?: string;
  label: string;
  color?: number;
  worked: number;
  estimated: number;
  checked: boolean;
  order: number;
};

export enum IntervalBarContext {
  ZEN_ON_DESKTOP = "ZEN_ON_DESKTOP",
  DEFAULT = "DEFAULT"
}

export interface FocusItemsStore extends ICacheableStore {
  items: FocusItem[];
}
