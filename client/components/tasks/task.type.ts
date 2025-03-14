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
  completed?: Date;
}

export interface ITask extends ITaskBase {
  goalId?: IRecordId;
}

export interface ITaskStore extends IObservableStoreSubject {}

export interface ITaskThumb extends ITaskBase {
  goal?: IGoal;
}
