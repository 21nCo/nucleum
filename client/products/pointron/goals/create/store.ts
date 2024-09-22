import type { IGoal } from "$lib/client/types/pointron/goal.type";
import { goalStore, seedGoal } from "../goal.store";
import { ObservableStore } from "$lib/client/stores/client.store";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import { deepCopy } from "$lib/shared/utils/obj.utils";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

class NewGoalStore extends ObservableStore<IGoal & IObservableStoreSubject> {
  constructor() {
    super("newGoal");
    this.reset();
  }
  reset() {
    this.set({
      ...deepCopy(seedGoal),
      id: generateResourceId(Resource.PointGoal),
      color: Math.floor(Math.random() * 360) + 1
    });
  }
  async save() {
    await goalStore.save(this.get());
    this.reset();
  }
  async saveGoalWithLabel(label: string) {
    this.reset();
    const goal = { ...this.get(), label };
    await goalStore.save(goal);
    return goal;
  }
}

export const newGoal = new NewGoalStore();
