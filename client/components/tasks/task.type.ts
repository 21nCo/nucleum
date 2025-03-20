import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type { IGoal } from "../goals/goal.type";

interface ITaskBase extends IMemotronItemBase {
  isChecked: boolean;
  /**
   * Estimated time in seconds
   */
  estimated?: number;
  date?: Date;
  completedAt?: Date;
}

export interface ITask extends ITaskBase {
  goalId?: IRecordId;
}

export interface ITaskStore extends IObservableStoreSubject {}

export interface ITaskThumb extends ITaskBase {
  goal?: IGoal;
}

export enum TaskSubTypeForSwitcher {
  BY_DATE = "bydate",
  BY_MONTH = "bymonth",
  /**
   * @deprecated
   */
  OVERDUE = "overdue",
  /**
   * @deprecated
   */
  WITHOUT_DUE_DATE = "without-due-date",
  /**
   * @deprecated
   */
  WITHOUT_GOAL = "without-goal"
}

export enum TaskDueDateFilter {
  ALL = "all",
  OVERDUE = "overdue",
  WITHOUT_DUE_DATE = "without-due-date"
}
