import { flux } from "$lib/client/components/flux/flux";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  GoalStatus,
  GoalType,
  type IGoal
} from "$lib/client/components/goals/goal.type";
import type { ITask } from "$lib/client/components/tasks/task.type";
import { PersistenceActionType } from "$lib/client/types/data.type";

/**
 * v0.83.0 - replacing "$NONE" which is undefined with 0 or empty string at relevant places - for indexing of non-present values as well
 */
export async function defaultsMigrationFocus() {
  await defaultsMigrationForTasks();
  await defaultsMigrationForGoals();
}

async function defaultsMigrationForTasks() {
  const tasks = await flux.selectMany(Resource.task);
  const tasksWithoutDate = tasks.filter(
    (x: ITask) => !x.dateUnix && x.dateUnix !== 0
  );
  console.log({ at: "defaultsMigrationForTasks", tasksWithoutDate });
  if (tasksWithoutDate.length) {
    await flux.mutation<ITask>(Resource.task, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: tasksWithoutDate.map((x: ITask) => x.id),
      changes: {
        dateUnix: 0
      }
    });
  }
  const tasksWithoutGoal = tasks.filter(
    (x: ITask) => !x.goalId && x.goalId !== ""
  );
  console.log({ at: "defaultsMigrationForTasks", tasksWithoutGoal });
  if (tasksWithoutGoal.length) {
    await flux.mutation<ITask>(Resource.task, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: tasksWithoutGoal.map((x: ITask) => x.id),
      changes: {
        goalId: ""
      }
    });
  }
}

async function defaultsMigrationForGoals() {
  const goals = await flux.selectMany(Resource.goal);
  const goalsWithoutType = goals.filter((x: IGoal) => !x.type);
  console.log({ at: "defaultsMigrationForGoals", goalsWithoutType });
  if (goalsWithoutType.length) {
    await flux.mutation<IGoal>(Resource.goal, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: goalsWithoutType.map((x: IGoal) => x.id),
      changes: {
        type: GoalType.INDEFINITE
      }
    });
  }
  const goalsWithoutParent = goals.filter(
    (x: IGoal) =>
      (!x.parent && x.parent !== 0) ||
      (Array.isArray(x.parent) && x.parent.length === 0)
  );
  console.log({ at: "defaultsMigrationForGoals", goalsWithoutParent });
  if (goalsWithoutParent.length) {
    await flux.mutation<IGoal>(Resource.goal, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: goalsWithoutParent.map((x: IGoal) => x.id),
      changes: {
        parent: 0
      }
    });
  }
  const goalsWithoutStatus = goals.filter((x: IGoal) => !x.status);
  console.log({ at: "defaultsMigrationForGoals", goalsWithoutStatus });
  if (goalsWithoutStatus.length) {
    await flux.mutation<IGoal>(Resource.goal, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: goalsWithoutStatus.map((x: IGoal) => x.id),
      changes: {
        status: GoalStatus.NOT_STARTED
      }
    });
  }
}
