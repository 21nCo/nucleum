import type { IMarkdown } from "../markdown/md.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IActiveResource } from "../flux/resourceStores/resource.type";
import type { ICollectionExpanded } from "../collection/collection.type";
import type { TimeScale } from "$lib/client/types/time.type";

export enum TaskType {
  INDEFINITE = "INDEFINITE",
  DEFINITE = "DEFINITE",
  ROUTINE = "ROUTINE"
}
export enum SubTasksMethod {
  DEFAULT = "DEFAULT",
  TREE = "TREE",
  STEPS = "STEPS"
}
export interface ITaskBase {
  label: string;
  type: TaskType;
  description?: IMarkdown;
  startDate?: Date;
  endDate?: Date;
  spanScale?: TimeScale;
  parent?: IRecordId[];
  subTasks?: IRecordId[];
  subTasksMethod?: SubTasksMethod;
  status?: TaskStatus;
  color?: number;
}

export interface ITask extends ITaskBase {}

export interface ITaskThumb extends ITaskBase {}

export type IActiveTask = IActiveResource &
  ITask & {
    subTasks?: IActiveTask[];
    isPageLoading: boolean;
    collections?: IRecordId[];
    types?: ICollectionExpanded[];
  };

export enum TaskStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED"
}
