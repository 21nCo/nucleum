import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import type { IPointGoal } from "$lib/client/types/pointron/goal.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";

const surrealDb = new SurrealDatabase();

const tableName = Resource[Resource.PointGoal];

export class GoalPersistence {
  async create(goals: IPointGoal[]) {
    let response = await surrealDb.insert(tableName, goals);
    return response && response.length > 0;
  }
  async convertToGoal(goalId: string) {
    let response = await surrealDb.query("update $goalId set parent = []", {
      goalId
    });
    if (response && response.length > 0) return response[1].result.length == 0;
    else return null;
  }
  async convertToSubGoal(goalId: string, parentId: string) {
    //todo - already a sub goal of this parent check
    if (goalId == parentId) return false;
    let response = await surrealDb.query(
      "update $goalId set parent = [$parentId.parent, $parentId]",
      {
        goalId,
        parentId
      }
    );
    return response && response.length > 0;
  }
  async updateIsPinnedForQuickStart(goalId: string, isPinned: boolean) {
    let response = await surrealDb.query(
      "update $goalId set isPinnedForQuickStart = $isPinned",
      {
        goalId,
        isPinned
      }
    );
    return response && response.length > 0;
  }
}
