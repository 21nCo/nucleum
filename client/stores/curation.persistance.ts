import { SurrealDatabase } from "$lib/client/access/surrealHelper";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import type {
  ICollectionView,
  ICurationCreationForm
} from "../types/memotron/curation.type";

const surrealDb = new SurrealDatabase();
export class CurationPersistance {
  /**
   * ! Deprecated
   * dataManager delegation - performMutation, performMutationForIFR is being used
   * @param curation
   * @returns
   */
  async create(curation: ICurationCreationForm) {
    let response = await surrealDb.query(
      "return fn::memotron::curation::create($curation);",
      {
        curation
      }
    );
    return interceptSurrealResponse(response, "create curation");
  }

  async fetch(id: string, viewId?: string) {
    const query = `fn::memotron::curation::fetch($id, $viewId)`;
    const response = await surrealDb.executeReadFn(
      query,
      viewId ? { id, viewId } : { id }
    );
    return interceptSurrealResponse(response, "fetch curation");
  }

  async createView(view: ICollectionView, collectionId: string) {
    const query = `fn::memotron::collection::createView($view, $collectionId)`;
    const response = await surrealDb.query(query, {
      view,
      collectionId
    });
    return interceptSurrealResponse(response, "create view");
  }
  async fetchViewData(viewId: string, collectionId: string) {
    const query = `fn::memotron::collection::fetchData($viewId, $collectionId)`;
    const response = await surrealDb.query(query, {
      viewId,
      collectionId
    });
    return interceptSurrealResponse(response, "fetch view data");
  }
}
