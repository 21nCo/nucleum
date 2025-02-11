import { TaskType } from "./task.type";
import type { ISelectItem } from "$lib/client/types/select.type";

export function resolveTaskTypeIcon(type: TaskType) {
  switch (type) {
    case TaskType.INDEFINITE:
      return "ph:infinity-light";
    case TaskType.DEFINITE:
      return "ph:target-light";
    case TaskType.ROUTINE:
      return "ph:arrow-counter-clockwise-light";
  }
}

export function resolveTaskTypeLabel(type: TaskType) {
  switch (type) {
    case TaskType.INDEFINITE:
      return "Indefinite";
    case TaskType.DEFINITE:
      return "Definite";
    case TaskType.ROUTINE:
      return "Routine";
  }
}

export function resolveTaskSubTypesForSwitcher(
  isLowerCaseValue: boolean = false
) {
  const taskTypes = [
    TaskType.INDEFINITE,
    TaskType.DEFINITE,
    TaskType.ROUTINE
  ].map((x) => {
    return {
      label: resolveTaskTypeLabel(x),
      value: isLowerCaseValue ? x.toLowerCase() : x,
      icon: resolveTaskTypeIcon(x),
      isDisabled: x === TaskType.ROUTINE,
      badge: x === TaskType.ROUTINE ? "planned" : undefined
    };
  });
  return taskTypes;
}
