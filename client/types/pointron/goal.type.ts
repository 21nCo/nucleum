import type { IStore } from "$lib/client/types/data.type";
import type { TimePeriod } from "$lib/client/types/time.type";
import type {
  IResourceBase,
  ITrashInformation
} from "../../components/flux/resourceStores/resource.type";
import { TagId } from "./tagId.enum";

/**
 * @deprecated - use IGoal from goals/goal.type.ts instead
 */
export type IGoal = {
  id: string;
  label: string;
  subGoalCount: number;
  parent?: GoalParent;
  subGoals: IGoal[];
  archivedSubGoalCount: number;
  description?: string;
  tags?: string[];
  isArchived?: boolean;
  isPinnedForQuickStart?: boolean;
  isStarred?: boolean;
  isCompleted?: boolean;
  color?: number;
  analytics?: GoalAnalyticsType;
  pendingChanges?: boolean;
  created?: string;
  modified?: string;
  trashInformation?: ITrashInformation;
  /**
   * Temp
   */
  subGoalsRefreshId?: string;
};

type GoalParent = {
  color?: number;
  hierarchy: Pick<IGoal, "id" | "label">[];
};

export type IPointGoal = IResourceBase & {
  label: string;
  parent: string[];
  description?: string;
  tags?: string[];
  isArchived?: boolean;
  isPinnedForQuickStart?: boolean;
  isStarred?: boolean;
  isCompleted?: boolean;
  color?: number | null;
};

export type GoalAnalyticsType = {
  periods: TimePeriod[];
};

export type QuickFocusItem = Pick<
  IGoal,
  "id" | "label" | "color" | "parent" | "tags" | "isStarred"
> & {
  focus?: number;
};

export interface GoalStore extends IStore {
  goals: IGoal[];
  filteredGoals: IGoal[];
  archivedGoals: IGoal[];
}

export interface IQuickFocusItemStore {
  items: QuickFocusItem[];
  filteredItems: QuickFocusItem[];
  selectedTagId: string | TagId;
}
