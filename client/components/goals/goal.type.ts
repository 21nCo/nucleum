import type { IMarkdown } from "@21n/components/markdown/md.type";
import type { IRecordId } from "@21n/types/data.type";
import type {
  IActiveResource,
  IResource,
  IResourceArchivable,
  IResourceInActivableFromParent,
  IResourceLabeled,
  IResourcePageWithPanels,
  IResourceStarrable,
  IResourceShareable
} from "@21n/components/flux/resourceStores/resource.type";
import type {
  ICollectible,
  ICollectionExpanded
} from "@21n/components/collection/collection.type";
import type { TimeScale } from "@21n/types/time.type";
import type { ITask } from "@21n/components/tasks/task.type";

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
export interface IGoalBase extends IResourceLabeled, ICollectible {
  type?: GoalType;
  description?: IMarkdown;
  startDate?: Date;
  endDate?: Date;
  spanScale?: TimeScale;
  subGoalsLayout?: SubGoalsLayout;
  status?: GoalStatus;
  color?: number;
  isPinnedForQuickFocus?: boolean;
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
export interface IGoalCapture extends IGoalBase {
  id?: IRecordId;
  parent?: IRecordId[];
  children?: IRecordId[];
}

type IResourcePropertiesForGoal = IResource &
  IResourceShareable &
  IResourceStarrable &
  IResourceArchivable &
  IResourceInActivableFromParent;

export type IGoal = IResourcePropertiesForGoal &
  IGoalBase & {
    /**
     * Has index
     */
    type: GoalType;
    /**
     * Has index
     */
    status: GoalStatus;
    /**
     * Has index
     */
    parent: IRecordId[] | 0;
    children?: IRecordId[];
  };

export type IGoalThumb = IResourcePropertiesForGoal &
  IGoalBase & {
    parent?: IGoal[];
    children?: IRecordId[];
  };

export type IActiveGoal = IActiveResource &
  IResourcePageWithPanels &
  Omit<IGoal, "parent" | "children"> & {
    type: GoalType;
    parent?: IGoalThumb[];
    children?: IGoal[];
    isPageLoading: boolean;
    collections?: IRecordId[];
    types?: ICollectionExpanded[];
    taskCount?: number;
  };

export enum GoalStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED"
}
