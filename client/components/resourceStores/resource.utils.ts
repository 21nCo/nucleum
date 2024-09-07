import type { RecordId } from "surrealdb.js";
import type { Resource } from "./resource.enum";
import type { ResourceActionType } from "./resource.type";

export function resourceAction(resource: Resource, action: ResourceActionType) {
  return `${resource}:${action}`;
}

export function determineResourceType(id: string | RecordId) {
  if (typeof id !== "string") return id.tb as Resource;
  const parts = id.split(":");
  if (parts.length > 1) return parts[0] as Resource;
  return id;
}
