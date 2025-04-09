import { flux } from "$lib/client/components/flux/flux";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { PersistenceActionType } from "$lib/client/types/data.type";
import {
  isSameResource,
  removeDuplicatesFilter,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";

/**
 * Correction for incorrect migration of old goals to new goals in Pointron v0.82.0
 */
export async function nestedGoalCorrection() {
  const result = await flux.selectMany(Resource.goal, {
    filters: {
      isMigrated: true
    }
  });
  if (!result || !Array.isArray(result)) return;
  const eligibleSubGoals = result.filter(
    (goal) => Array.isArray(goal.parent) && goal.parent.length > 1
  );
  const goalsForCorrection = eligibleSubGoals
    .map((goal) => {
      return goal.parent.slice(0, -1);
    })
    .flat()
    .filter(removeDuplicatesFilter);
  const validGoalsForCorrection = goalsForCorrection
    .map((goal) => {
      const fullGoal = result.find(resourceInList(goal));
      if (!fullGoal || fullGoal.isMigrationCorrected === true) return null;
      return fullGoal;
    })
    .filter((x) => x !== null);
  const promises = validGoalsForCorrection.map((goal) => {
    const correctedChildren = result
      .filter(
        (x) =>
          Array.isArray(x.parent) &&
          isSameResource(x.parent[x.parent.length - 1], goal)
      )
      ?.map((x) => x.id);
    return flux.mutation(Resource.goal, {
      action: PersistenceActionType.MERGE,
      record: {
        id: goal.id,
        children: correctedChildren,
        isMigrationCorrected: true
      }
    });
  });
  console.log({ goalsForCorrection, validGoalsForCorrection });
  await Promise.all(promises);
}
