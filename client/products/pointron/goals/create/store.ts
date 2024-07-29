import type { IGoal } from "$lib/client/types/pointron/goal.type";
import { goalStore, seedGoal } from "../goal.store";
import { ObservableStore } from "$lib/client/stores/client.store";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import { generateUID } from "$lib/client/utils/utils";
import { deepCopy } from "$lib/shared/utils/obj.utils";

class NewGoalStore extends ObservableStore<IGoal & IObservableStoreSubject> {
  constructor() {
    super("newGoal");
    this.reset();
  }
  reset() {
    this.set({
      ...deepCopy(seedGoal),
      id: generateUID(),
      color: Math.floor(Math.random() * 360) + 1
    });
  }
  async save() {
    await goalStore.save(this.get());
    this.reset();
  }
}

export const newGoal = new NewGoalStore();
