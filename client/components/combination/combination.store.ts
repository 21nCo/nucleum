import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  ActiveResourceStore,
  ResourceStore,
  activeResources
} from "$lib/client/components/flux/resourceStores/resource.store";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IActiveCombination, ICombination } from "./combination.type";
import {
  ResourceAccessMode,
  ResourceAccessPoint
} from "$lib/client/components/flux/resourceStores/resource.type";
import {
  type IContextMenu,
  type IContextMenuItem
} from "$lib/client/types/select.type";
import { ResourceActions } from "$lib/client/components/record/resource.actions";

class CombinationStore extends ResourceStore<ICombination> {
  constructor() {
    super(Resource.combination);
  }
}

export const combinationStore = new CombinationStore();

export class ActiveCombinationStore extends ActiveResourceStore<any, any> {
  constructor(combinationId: IRecordId) {
    super(combinationId, combinationStore);
  }

  async init(accessMode: ResourceAccessMode) {
    try {
      this.update((val: any) => {
        if (val) val.isPageLoading = true;
        else val = { isPageLoading: true };
        val.accessMode = accessMode;
        return val;
      });

      const result = await this.resourceStore.select(this.id);
      if (!result) return;

      this.set({
        ...result,
        accessMode,
        isPageLoading: false
      });
    } catch (e) {
      console.error("error in init combination store", {
        id: this.id,
        error: e
      });
    }
  }
}

export function resolveCombinationContextMenu(
  combination: ICombination,
  accessPoint: ResourceAccessPoint
): IContextMenu {
  const resourceActions = new ResourceActions(
    combination,
    combinationStore,
    accessPoint
  );

  return [
    {
      group: "primary",
      items: [
        resourceActions.edit(accessPoint),
        resourceActions.star(),
        resourceActions.copyLink()
      ]
    },
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}
