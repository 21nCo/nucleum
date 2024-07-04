import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import type { PointGoalDbType } from "$lib/client/types/pointron/goal.type";
import { Item } from "$lib/client/types/item.enum";
import { interceptSurrealResponse } from "$lib/client/utils/utils";

const surrealDb = new SurrealDatabase();

const tableName = Item[Item.PointGoal];

export class GoalPersistence {
  async create(goals: PointGoalDbType[]) {
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
  async fetchSubgoals(parentId: string) {
    let response = await surrealDb.executeReadFn(
      `return fn::pointron::goals::fetchSubGoals($parentId, false);`,
      { parentId }
    );
    return interceptSurrealResponse(response);
  }
  async fetch(id: string) {
    let response = await surrealDb.executeReadFn(
      `return fn::pointron::goal::fetch($id)`,
      { id }
    );
    return interceptSurrealResponse(response);
  }
  async fetchGoalsForQuickStart(
    isFavoritesOnly: boolean = false,
    tagId: string = "PointTag:none"
  ) {
    let response = await surrealDb.executeReadFn(
      `return fn::pointron::goals::quickFocus::v2($isFavoritesOnly,$tagId);`,
      {
        isFavoritesOnly,
        tagId
      }
    );
    return interceptSurrealResponse(response);
  }
  async fetchAllGoalColors() {
    let response = await surrealDb.query(
      "select color, label from PointGoal where parent is none or array::len(parent) < 1;"
    );
    return interceptSurrealResponse(response);
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
