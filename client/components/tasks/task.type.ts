import type { IMarkdown } from "../markdown/md.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type {
  IActiveResource,
  IResource
} from "../flux/resourceStores/resource.type";
import type { ICollectionExpanded } from "../collection/collection.type";

export enum TaskType {
  INDEFINITE = "INDEFINITE",
  DEFINITE = "DEFINITE",
  ROUTINE = "ROUTINE"
}

export interface ITaskBase {
  label: string;
  type: TaskType;
  description?: IMarkdown;
  startDate?: Date;
  endDate?: Date;
  parent?: IRecordId;
  subTasks?: IRecordId[];
}

export interface ITask extends ITaskBase {}

export interface ITaskThumb extends ITaskBase {}

export type IActiveTask = IActiveResource &
  ITask & {
    isPageLoading: boolean;
    collections?: IRecordId[];
    types?: ICollectionExpanded[];
  };
