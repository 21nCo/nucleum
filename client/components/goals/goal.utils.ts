import { GoalStatus, GoalType, type IGoalThumb } from "./goal.type";
import type { ISelectItem } from "$lib/client/types/select.type";

export function resolveGoalTypeIcon(type: GoalType) {
  switch (type) {
    case GoalType.INDEFINITE:
      return "ph:infinity-light";
    case GoalType.DEFINITE:
      return "ph:target-light";
  }
}

export function resolveGoalTypeLabel(type: GoalType) {
  switch (type) {
    case GoalType.INDEFINITE:
      return "Indefinite";
    case GoalType.DEFINITE:
      return "Definite";
  }
}

export function resolveGoalSubTypesForSwitcher(
  isLowerCaseValue: boolean = false
) {
  const goalTypes = [GoalType.INDEFINITE, GoalType.DEFINITE].map((x) => {
    return {
      label: resolveGoalTypeLabel(x),
      value: isLowerCaseValue ? x.toLowerCase() : x,
      icon: resolveGoalTypeIcon(x)
    };
  });
  return goalTypes;
}

export function resolveGoalStatusIcon(status: GoalStatus) {
  switch (status) {
    case GoalStatus.NOT_STARTED:
      return "ph:circle-light";
    case GoalStatus.IN_PROGRESS:
      return "ph:hourglass-simple-light";
    case GoalStatus.COMPLETED:
      return "ph:check-circle-fill";
    default:
      return "ph:circle-light";
  }
}

export function resolveGoalColor(goal?: IGoalThumb) {
  if (goal?.color) return goal.color;
  else if (goal?.parent && goal?.parent?.length > 0)
    return goal.parent[0].color;
  else return undefined;
}
