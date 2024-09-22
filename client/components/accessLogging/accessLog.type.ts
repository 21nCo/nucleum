import type { IResourceBase } from "../flux/resourceStores/resource.type";

export interface IAccessLog extends IResourceBase {
  action: string;
  resource: string;
  timestamp: string;
  resourceId?: string;
  context?: string;
  duration?: number;
}
