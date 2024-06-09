import { ResourcePersistence } from "$lib/client/persistence/resource.persistence";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { Item } from "$lib/client/types/item.enum";
import {
  CurationType,
  type ICollectionView,
  type ICurationCreationForm
} from "$lib/client/types/memotron/curation.type";
import { prefixTable } from "$lib/client/utils/text.utils";
import { generateUID, interceptSurrealResponse } from "$lib/client/utils/utils";

const surrealDb = new SurrealDatabase();
export class CurationPersistence extends ResourcePersistence {
  refreshQuery = "return fn::memotron::curation::fetchAll($since);";
  constructor(userId: string) {
    super(Item.curation, userId);
  }
  create(resource: ICurationCreationForm) {
    return super.create(
      {
        id: prefixTable(
          generateUID(),
          resource.type === CurationType.COLLECTION
            ? Item.collection
            : Item.combination
        ),
        ...resource
      },
      "return fn::memotron::curation::create($curation, $mutatedAt);"
    );
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
