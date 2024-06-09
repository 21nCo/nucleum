import type { DbRecordBase } from "$lib/client/types/dbrecord.type";
import type { ICacheableStore } from "$lib/client/types/data.type";
import type { TimePeriod } from "$lib/client/types/time.type";

export type Goal = {
  id: string;
  label: string;
  subGoalCount: number;
  parent?: GoalParent;
  subGoals: Goal[];
  archivedSubGoalCount: number;
  description?: string;
  tags?: string[];
  isArchived?: boolean;
  isPinnedForQuickStart?: boolean;
  isFavorite?: boolean;
  isCompleted?: boolean;
  color?: number;
  analytics?: GoalAnalyticsType;
  pendingChanges?: boolean;
  created?: string;
  modified?: string;
};

type GoalParent = {
  color?: number;
  hierarchy: Pick<Goal, "id" | "label">[];
};

export type PointGoalDbType = DbRecordBase & {
  label: string;
  parent: string[];
  description?: string;
  tags?: string[];
  isArchived?: boolean;
  isPinnedForQuickStart?: boolean;
  isFavorite?: boolean;
  isCompleted?: boolean;
  color?: number | null;
};

export type GoalAnalyticsType = {
  periods: TimePeriod[];
};

export type QuickFocusItem = Pick<
  Goal,
  "id" | "label" | "color" | "parent" | "tags" | "isFavorite"
> & {
  focus?: number;
};

export interface GoalStore extends ICacheableStore {
  goals: Goal[];
  filteredGoals: Goal[];
  archivedGoals: Goal[];
}

export interface QuickFocusItemStore extends ICacheableStore {
  items: QuickFocusItem[];
  filteredItems: QuickFocusItem[];
}

export interface NewGoalStore extends ICacheableStore {
  goal: Goal;
}
