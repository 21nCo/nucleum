import type { IRecordId } from "$lib/client/types/data.type";
import type {
  IMetaResource,
  ResourceActionType
} from "../flux/resourceStores/resource.type";

export interface IAccessLog extends IMetaResource {
  action: ResourceActionType;
  resource: string;
  timestamp: string;
  resourceId?: IRecordId;
  context?: string;
  duration?: number;
}
