import type { Resource } from "./resource.enum";
import type { ResourceActionType } from "./resource.type";

export function resourceAction(resource: Resource, action: ResourceActionType) {
  return `${resource}:${action}`;
}
