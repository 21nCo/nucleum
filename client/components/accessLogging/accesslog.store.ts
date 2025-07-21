import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IAccessLog } from "./accessLog.type";

class AccessLogStore extends ResourceStore<IAccessLog, IAccessLog> {
  constructor() {
    super(Resource.accessLog, {
      isCloudOnlyResource: true
    });
  }

  async fetch(resourceId: IRecordId): Promise<IAccessLog[]> {
    return this.selectMany({
      filters: {
        resourceId: resourceId.toString()
      }
    });
  }
}
export const accessLogStore = new AccessLogStore();
