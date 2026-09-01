import { flux } from "@21n/components/flux/flux";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { PersistenceActionType } from "@21n/types/data.type";
import {
  determineResourceType,
  isSameResource,
  removeDuplicatesFilter,
  resourceInList
} from "@21n/components/flux/resourceStores/resource.utils";
import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
import type { IGoal } from "@21n/components/goals/goal.type";
import type { IRecordId } from "@21n/types/data.type";
import type { ILinkThumb } from "@21n/products/memotron/linking/link.type";

type IPointronGoal = IGoal & {
  isMigrationCorrected?: boolean;
  collections?: IRecordId[];
};

/**
 * Correction for incorrect migration of old goals to new goals in Pointron v0.82.0
 */
export async function nestedGoalCorrection() {
  const result = (await flux.selectMany(Resource.goal, {
    filters: {
      isMigrated: true
    }
  })) as IPointronGoal[] | undefined;
  if (!result || !Array.isArray(result)) return;
  const eligibleSubGoals = result.filter(
    (goal: IPointronGoal): goal is IPointronGoal & { parent: IRecordId[] } =>
      Array.isArray(goal.parent) && goal.parent.length > 1
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
    .filter((goal): goal is IPointronGoal => goal !== null);
  const promises = validGoalsForCorrection.map((goal) => {
    const correctedChildren = result
      .filter(
        (x: IPointronGoal) =>
          Array.isArray(x.parent) &&
          isSameResource(x.parent[x.parent.length - 1], goal)
      )
      .map((x: IPointronGoal) => x.id);
    return flux.mutation<IPointronGoal>(Resource.goal, {
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
  const collections = (await flux.selectMany(Resource.collection, {
    properties: {
      select: ["id"]
    }
  })) as Array<{ id: IRecordId }> | undefined;
  if (!collections?.length) return;

  const records = (await flux.selectMany(Resource.link, {
    properties: {
      expand: ["in"]
    },
    filters: {
      out: collections.map((collection) => collection.id.toString())
    }
  })) as ILinkThumb[] | undefined;
  console.log({ at: "collectionsListOnRecords", collections, records });
  if (records && isValidArrayWithData(records)) {
    const filteredRecords = records.filter((x: ILinkThumb) => {
      return determineResourceType(x.in?.id) === Resource.goal;
    });
    const uniqueGoals = filteredRecords
      .map((x: ILinkThumb) => x.in as IPointronGoal)
      .filter(removeDuplicatesFilter)
      .filter((goal: IPointronGoal) => !goal.collections);
    console.log({ at: "collectionsListOnRecords", uniqueGoals });
    if (!uniqueGoals || !uniqueGoals.length) return;
    const promises: Promise<any>[] = [];
    uniqueGoals.forEach((goal: IPointronGoal) => {
      const collections = filteredRecords
        .filter((link: ILinkThumb) => isSameResource(link.in, goal))
        .map((link: ILinkThumb) => link.out.id);
      console.log({ at: "collectionsListOnRecords", goal, collections });
      promises.push(
        flux.mutation<IPointronGoal>(Resource.goal, {
          action: PersistenceActionType.MERGE,
          record: {
            id: goal.id,
            collections
          }
        })
      );
    });
    await Promise.all(promises);
  }
}
