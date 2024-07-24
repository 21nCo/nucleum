import { Cloud } from "$lib/client/types/cloud.enum";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { get } from "svelte/store";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import { retrieveLocally } from "$lib/client/utils/storage.utils";
import { cloudProvider } from "$lib/client/persistence/persistence";

const surrealDb = new SurrealDatabase();
export class FocusPersistence {
  async resetSession() {
    let response;
    switch (get(cloudProvider)) {
      case Cloud.local:
        //persistLocally(Item.PointLog, logs);
        break;
      case Cloud.surreal:
        response = await surrealDb.query(`fn::pointron::focus::reset::v4()`);
        return interceptSurrealResponse(response);
    }
  }
  async retrieveLogs(date: Date, goalId: string | undefined = undefined) {
    switch (get(cloudProvider) as Cloud) {
      case Cloud.local:
        return retrieveLocally(Resource.pointSessionSnapshot);
      case Cloud.surreal: {
        let response = await surrealDb.executeReadFn(
          "return fn::pointron::logs::fetch::v3($date);",
          {
            date: new Date(date).toISOString()
          }
        );
        return interceptSurrealResponse(response);
      }
      default:
        console.log("retrieveLogs default");
        return null;
    }
  }
  async fetchSession(id: string) {
    switch (get(cloudProvider) as Cloud) {
      case Cloud.local:
        return retrieveLocally(Resource.pointSessionSnapshot);
      case Cloud.surreal: {
        let response = await surrealDb.executeReadFn(
          "return fn::pointron::log::fetch($id);",
          {
            id
          }
        );
        return interceptSurrealResponse(response);
      }
      default:
        return null;
    }
  }
}
