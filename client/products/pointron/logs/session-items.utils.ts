import type { IObjective } from "@21n/components/goals/goal.type";
import type { ITask } from "@21n/components/tasks/task.type";
import { Resource } from "@21n/data/datafn/resource.enum";
import { determineResourceType } from "@21n/data/datafn/resource.utils";

export type SessionItemRelationMetadata = {
  from?: string;
  to?: string;
  toResource?: string;
  parentObjectiveId?: string | null;
  sortOrder?: number;
  blocks?: { start: number; end: number }[];
};

export type SessionRelatedItem = (IObjective | ITask) &
  SessionItemRelationMetadata & {
    $relation_metadata?: SessionItemRelationMetadata;
  };

/**
 * Resolves the metadata DataFn returns for a session item relation row.
 */
export function resolveSessionItemRelationMetadata(
  item: SessionRelatedItem
): SessionItemRelationMetadata {
  return item.$relation_metadata ?? item;
}

/**
 * Returns expanded objective and task records from a session relation result in stable relation order.
 */
export function resolveExpandedSessionItems(
  items: SessionRelatedItem[] | undefined
): SessionRelatedItem[] {
  return orderSessionRelatedItems(items).filter((item) => {
    const resourceType = determineResourceType(item.id);
    return resourceType === Resource.objective || resourceType === Resource.task;
  });
}

function orderSessionRelatedItems(
  items: SessionRelatedItem[] | undefined
): SessionRelatedItem[] {
  return [...(items ?? [])].sort((a, b) => {
    const aOrder = resolveSessionItemRelationMetadata(a).sortOrder ?? 0;
    const bOrder = resolveSessionItemRelationMetadata(b).sortOrder ?? 0;
    return aOrder - bOrder;
  });
}
