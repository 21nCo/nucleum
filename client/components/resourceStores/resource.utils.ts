import type { Resource } from "./resource.enum";
import type { ResourceActionType } from "./resource.type";

export function resourceAction(resource: Resource, action: ResourceActionType) {
  return `${resource}:${action}`;
}

export function determineResourceType(id: string) {
  const parts = id.split(":");
  if (parts.length > 1) return parts[0] as Resource;
  return id;
}
