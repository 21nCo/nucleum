import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  ActiveResourceStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IActiveCombination, ICombination } from "./combination.type";

class CombinationStore extends ResourceStore<ICombination> {
  constructor() {
    super(Resource.combination);
  }
}

export const combinationStore = new CombinationStore();

export class ActiveCombinationStore extends ActiveResourceStore<
  IActiveCombination,
  CombinationStore
> {
  constructor(combinationId: IRecordId) {
    super(combinationId, combinationStore);
  }
}
