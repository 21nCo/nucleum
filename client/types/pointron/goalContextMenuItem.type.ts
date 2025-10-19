import type { DynamicIconProp } from "@21n/types/pointron/dynamicIconProp.type";
import type { GoalContextMenuAction } from "@21n/types/pointron/goalContextMenuAction.enum";

export type GoalContextMenuItem = {
  label: string;
  action: GoalContextMenuAction;
  icon?: string;
};
