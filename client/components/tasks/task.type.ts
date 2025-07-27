import type { IRecordId } from "$lib/client/types/data.type";
import type {
  IResource,
  IResourceInActivableFromParent,
  IResourceLabeled
} from "../flux/resourceStores/resource.type";
import type { IGoal } from "../goals/goal.type";

interface ITaskBase extends IResourceLabeled {
  isChecked?: boolean;
  /**
   * Estimated time in seconds
   */
  estimated?: number;
  /**
   * @deprecated - use {@link dateUnix} instead
   */
  date?: Date;
  /**
   * The unix timestamp of the date
   */
  dateUnix?: number;
  /**
   * The time in minutes since midnight
   */
  minutes?: number;
  /**
   * @deprecated - use {@link completedAtUnix} instead
   * The date the task was completed
   */
  completedAt?: Date;
  /**
   * The unix timestamp of the completed date
   */
  completedAtUnix?: number;
}

type IResourcePropertiesForTask = IResource & IResourceInActivableFromParent;

export type ITaskCapture = ITaskBase & {
  id?: IRecordId;
  goalId?: IRecordId;
};

export type ITask = IResourcePropertiesForTask &
  ITaskBase & {
    dateUnix: number;
    goalId: IRecordId;
  };

export interface ITaskThumb extends ITaskBase, IResourcePropertiesForTask {
  goalId?: IRecordId;
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
