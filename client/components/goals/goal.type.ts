import type { IMarkdown } from "../markdown/md.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IActiveResource } from "../flux/resourceStores/resource.type";
import type {
  ICollectionExpanded,
  ICollectionItemPropertyValue
} from "../collection/collection.type";
import type { TimeScale } from "$lib/client/types/time.type";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type { ITask } from "../tasks/task.type";

export enum GoalType {
  INDEFINITE = "INDEFINITE",
  DEFINITE = "DEFINITE",
  /**
   * @deprecated - repeated tasks i.e. routines are now handled in todos
   */
  ROUTINE = "ROUTINE"
}
export enum SubGoalsLayout {
  DEFAULT = "DEFAULT",
  TREE = "TREE",
  STEPS = "STEPS",
  TABS = "TABS",
  BOARDS = "BOARDS"
}
export interface IGoalBase extends IMemotronItemBase {
  label: string;
  type: GoalType;
  description?: IMarkdown;
  startDate?: Date;
  endDate?: Date;
  spanScale?: TimeScale;
  subGoalsLayout?: SubGoalsLayout;
  status?: GoalStatus;
  color?: number;
  isPinnedForQuickFocus?: boolean;
  properties?: ICollectionItemPropertyValue[];
  /**
   * @deprecated - use uiState.tabsOrder instead
   */
  tabsOrder?: string[];
  uiState?: {
    /**
     * Order of tabs on goal page.
     */
    tabsOrder?: string[];
    isHideCompleted?: boolean;
  };
}

export interface IGoal extends IGoalBase {
  parent?: IRecordId[];
  children?: IRecordId[];
}

export type IGoalThumb = IGoalBase & {
  parent?: IGoalThumb[];
  children?: IRecordId[];
};

export type IActiveGoal = IActiveResource &
  IGoalBase & {
    parent?: IGoalThumb[];
    children?: IActiveGoal[];
    isPageLoading: boolean;
    collections?: IRecordId[];
    types?: ICollectionExpanded[];
    tasks?: ITask[];
  };

export enum GoalStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED"
}
