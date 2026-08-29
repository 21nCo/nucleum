import {
  ObjectiveStatus,
  ObjectiveType,
  type IObjective,
  type IObjectiveThumb,
  type ObjectiveStatusValue,
  type ObjectiveTypeValue
} from "@21n/components/goals/goal.type";
import {
  isSameResource,
  resourceInList
} from "@21n/data/datafn/resource.utils";
import { datafn } from "@21n/stores/datafn.store";

export function resolveObjectiveTypeIcon(
  type: ObjectiveType | ObjectiveTypeValue
) {
  switch (type) {
    case ObjectiveType.INDEFINITE:
      return "infinity";
    case ObjectiveType.DEFINITE:
      return "timer";
  }
}

export function resolveObjectiveTypeLabel(
  type: ObjectiveType | ObjectiveTypeValue
) {
  switch (type) {
    case ObjectiveType.INDEFINITE:
      return "Indefinite";
    case ObjectiveType.DEFINITE:
      return "Definite";
  }
}

export function resolveObjectiveSubTypesForSwitcher(
  isLowerCaseValue: boolean = false
) {
  const objectiveTypes = [ObjectiveType.INDEFINITE, ObjectiveType.DEFINITE].map(
    (x) => {
      return {
        label: resolveObjectiveTypeLabel(x),
        value: isLowerCaseValue ? x.toLowerCase() : x,
        icon: resolveObjectiveTypeIcon(x)
      };
    }
  );
  return objectiveTypes;
}

export function resolveObjectiveStatusIcon(
  status: ObjectiveStatus | ObjectiveStatusValue
) {
  switch (status) {
    case ObjectiveStatus.NOT_STARTED:
      return "circle";
    case ObjectiveStatus.IN_PROGRESS:
      return "hourglass";
    case ObjectiveStatus.COMPLETED:
      return "check-circle";
    default:
      return "circle";
  }
}

export function resolveObjectiveColor(objective?: IObjectiveThumb) {
  if (objective?.color) return objective.color;
  else if (
    objective?.parent &&
    Array.isArray(objective?.parent) &&
    objective?.parent?.length > 0 &&
    typeof objective.parent[0] === "object" &&
    objective.parent[0]?.color
  ) {
    return objective.parent[0].color;
  }
  return undefined;
}

export async function updateObjectiveParent(
  src: IObjectiveThumb,
  parent?: IObjective | IObjectiveThumb
) {
  const sourceResult = await datafn.objective.query({
    select: ["id", "parentId", "children.**"],
    filters: {
      id: src.id.toString()
    },
    metadata: {
      includeTrashed: true,
      includeArchived: true,
      includeAncestorInactive: true
    },
    limit: 1
  });
  const source = sourceResult.data[0] as IObjective | undefined;
  const subObjectives: IObjectiveThumb[] = source?.children ?? [];
  if (parent && isSameResource(parent, src)) return false;
  if (parent && subObjectives.some(resourceInList(parent))) return false;
  const parentId = parent?.id?.toString();
  const sourceParentId = source?.parentId?.toString();
  let sortOrder = 0;
  if (sourceParentId && sourceParentId !== parentId) {
    await datafn.objective.mutate({
      operation: "unrelate",
      id: sourceParentId,
      relations: {
        children: [src.id.toString()]
      }
    });
  }
  if (parentId) {
    const parentResult = (await datafn.objective.select(parentId, {
      select: ["id", "children.*"],
      metadata: {
        includeTrashed: true,
        includeArchived: true,
        includeAncestorInactive: true
      }
    })) as IObjective | undefined;
    sortOrder = parentResult?.children?.length ?? 0;
    await datafn.objective.mutate({
      operation: "relate",
      id: parentId,
      relations: {
        children: [src.id.toString()]
      }
    });
  }
  await datafn.objective.mutate({
    operation: "merge",
    id: src.id.toString(),
    record: {
      id: src.id.toString(),
      sortOrder
    }
  });
  return true;
}
