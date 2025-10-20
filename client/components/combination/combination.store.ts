import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import {
  ActiveResourceStore,
  ResourceStore
} from "@21n/components/flux/resourceStores/resource.store";
import type { IRecordId } from "@21n/types/data.type";
import type { IActiveCombination, ICombination } from "@21n/components/combination/combination.type";

class CombinationStore extends ResourceStore<ICombination, ICombination> {
  constructor() {
    super(Resource.combination);
  }
}

export const combinationStore = CombinationStore.resolve(Resource.combination);

export class ActiveCombinationStore extends ActiveResourceStore<
  IActiveCombination,
  CombinationStore,
  ICombination
> {
  constructor(combinationId: IRecordId) {
    super(combinationId, combinationStore);
  }
}
