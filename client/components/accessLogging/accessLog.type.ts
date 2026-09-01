import type { IRecordId } from "@21n/types/data.type";
import type {
  IMetaResource,
  ResourceActionType
} from "@21n/components/flux/resourceStores/resource.type";

export interface IAccessLog extends IMetaResource {
  action: ResourceActionType;
  resource: string;
  timestamp: string;
  resourceId?: IRecordId;
  context?: string;
  duration?: number;
}
