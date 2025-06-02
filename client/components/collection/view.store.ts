import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { type ICollectionView } from "$lib/client/components/collection/collection.type";
import { flux } from "$lib/client/components/flux/flux";
import { StoreDataType, type IRecordId } from "$lib/client/types/data.type";

class CollectionViewStore extends ResourceStore<ICollectionView> {
  constructor() {
    super(Resource.view, {
      dataType: StoreDataType.FIR
    });
  }
  /**
   * fetch node ids from link table where out is collection id for simple and typed collections
   *
   * for query collection direct querying node table based on filters
   *
   * use view filters and node ids to fetch nodes
   * @param viewId
   * @param collectionId
   * @returns
   */
  async fetchViewData(
    collectionId: IRecordId,
    resourceStore: ResourceStore<any>,
    params?: {
      view?: ICollectionView;
      resource?: Resource;
    }
  ) {
    const { view, resource } = params ?? {};
    const items = await flux.selectMany(Resource.link, {
      filters: {
        out: collectionId.toString()
      }
    });
    const ids = items.map((x: any) => x.in).filter((x: any) => x);
    //TODO - other view filters will be applied here - if filters are present - totalCount should be queried separately without expansion of the items and only with active status filter.
    if (!resource || resource === Resource.node) {
      const nodes = await resourceStore.selectMany(
        {
          filters: {
            id: ids
          },
          orderBy: {
            modifiedAt: "desc"
          }
        },
        {
          isExpand: true
        }
      );
      return { items: nodes, totalCount: nodes.length };
    } else if (resource === Resource.goal) {
      const goals = await resourceStore.selectMany(
        {
          filters: {
            id: ids
          }
        },
        {
          isExpand: true
        }
      );
      return { items: goals, totalCount: goals.length };
    }
  }
}

export const viewStore = new CollectionViewStore();
