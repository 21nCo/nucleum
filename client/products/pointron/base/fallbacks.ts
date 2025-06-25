import { flux } from "$lib/client/components/flux/flux";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { PersistenceActionType } from "$lib/client/types/data.type";
import {
  determineResourceType,
  isSameResource,
  removeDuplicatesFilter,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";

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

/**
 * Changes made during v0.82.x - adding collections list to records - for faster collections lookup during searches, thumbnails, etc - for avatar, settings
 */
export async function collectionsListOnRecords() {
  const collections = await flux.selectMany(Resource.collection, {
    properties: ["id"]
  });

  const records = await flux.selectMany(Resource.link, {
    properties: ["in.* as in", "*"],
    filters: {
      out: collections.map((x) => x.id.toString())
    }
  });
  console.log({ at: "collectionsListOnRecords", collections, records });
  if (records && isValidArrayWithData(records)) {
    const filteredRecords = records.filter((x) => {
      return determineResourceType(x.in?.id) === Resource.goal;
    });
    const uniqueGoals = filteredRecords
      .map((x) => x.in)
      .filter(removeDuplicatesFilter)
      .filter((y) => !y.collections);
    console.log({ at: "collectionsListOnRecords", uniqueGoals });
    if (!uniqueGoals || !uniqueGoals.length) return;
    let promises: Promise<any>[] = [];
    uniqueGoals.forEach((x) => {
      const collections = filteredRecords
        ?.filter((y) => isSameResource(y.in, x))
        ?.map((y) => y.out);
      console.log({ at: "collectionsListOnRecords", x, collections });
      promises.push(
        flux.mutation(Resource.goal, {
          action: PersistenceActionType.MERGE,
          record: {
            id: x.id,
            collections: collections
          }
        })
      );
    });
    await Promise.all(promises);
  }
}
