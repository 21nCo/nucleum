import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import type { IAccessLog } from "./accessLog.type";

class AccessLogStore extends ResourceStore<IAccessLog> {
  constructor() {
    super(Resource.accessLog);
  }
}
export const accessLogStore = new AccessLogStore();
