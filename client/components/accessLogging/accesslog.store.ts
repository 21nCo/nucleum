import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "@21n/components/flux/resourceStores/resource.store";
import type { IRecordId } from "@21n/types/data.type";
import type { IAccessLog } from "@21n/components/accessLogging/accessLog.type";

class AccessLogStore extends ResourceStore<IAccessLog, IAccessLog> {
  constructor() {
    super(Resource.accessLog);
  }

  async fetch(resourceId: IRecordId): Promise<IAccessLog[]> {
    return this.selectMany({
      filters: {
        resourceId: resourceId.toString()
      }
    });
  }
}
export const accessLogStore = AccessLogStore.resolve(Resource.accessLog);
