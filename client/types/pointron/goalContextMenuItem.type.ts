import type { DynamicIconProp } from "./dynamicIconProp.type";
import type { GoalContextMenuAction } from "./goalContextMenuAction.enum";

export type GoalContextMenuItem = {
  label: string;
  action: GoalContextMenuAction;
  icon?: string;
};
