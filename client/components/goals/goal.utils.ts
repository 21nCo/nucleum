import { GoalStatus, GoalType, type IGoalThumb } from "./goal.type";
import type { ISelectItem } from "$lib/client/types/select.type";

export function resolveGoalTypeIcon(type: GoalType) {
  switch (type) {
    case GoalType.INDEFINITE:
      return "infinity";
    case GoalType.DEFINITE:
      return "timer";
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
      return "circle";
    case GoalStatus.IN_PROGRESS:
      return "hourglass";
    case GoalStatus.COMPLETED:
      return "check-circle";
    default:
      return "circle";
  }
}

export function resolveGoalColor(goal?: IGoalThumb) {
  if (goal?.color) return goal.color;
  else if (
    goal?.parent &&
    Array.isArray(goal?.parent) &&
    goal?.parent?.length > 0 &&
    typeof goal.parent[0] === "object" &&
    goal.parent[0]?.color
  ) {
    return goal.parent[0].color;
  }
  return undefined;
}
