<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import type { ITaskThumb } from "./task.type";
  import type { Arrangement } from "@21n/types/direction.enum";
  import type { IRecordId } from "@21n/types/data.type";
  import { ResourceAccessPoint } from "../flux/resourceStores/resource.type";
  import TaskThumbnail from "./TaskThumbnail.svelte";
  import TaskThumbnailGoalLabel from "./TaskThumbnailGoalLabel.svelte";
  import type { IGoalThumb } from "../goals/goal.type";
  import CreateTaskInlineWizard from "./CreateTaskInlineWizard.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  export let tasks: ITaskThumb[];
  export let accessPoint: ResourceAccessPoint;
  export let accessPointId: IRecordId | undefined = undefined;
  export let parentBgIndex: number;
  export let arrangement: Arrangement;
  export let isDisableGrouping: boolean = false;
  export let date: Date | undefined = undefined;
  let createTaskWizardForGoal: IRecordId | undefined = undefined;

  $: tasksByGoal = isDisableGrouping ? null : groupTasksByGoal(tasks);

  function resolveSize(accessPoint: ResourceAccessPoint) {
    if (
      accessPoint === ResourceAccessPoint.LIBRARY ||
      accessPoint === ResourceAccessPoint.GOAL
    ) {
      return Size.lg;
    }
    return Size.md;
  }

  function groupTasksByGoal(tasks: ITaskThumb[]) {
    const groups = new Map<
      IRecordId,
      { tasks: ITaskThumb[]; goal: IGoalThumb }
    >();
    let nonGoalTasks: ITaskThumb[] = [];
    const tasksByGoalId = new Map<IRecordId, ITaskThumb[]>();

    for (const task of tasks) {
      if (!task.goalId) {
        nonGoalTasks.push(task);
        continue;
      }

      const existing = tasksByGoalId.get(task.goalId);
      if (existing) {
        existing.push(task);
      } else {
        tasksByGoalId.set(task.goalId, [task]);
      }
    }

    for (const [goalId, goalTasks] of tasksByGoalId.entries()) {
      if (goalTasks.length > 1 && goalTasks[0].goal) {
        groups.set(goalId, {
          tasks: goalTasks,
          goal: goalTasks[0].goal
        });
      } else {
        nonGoalTasks.push(...goalTasks);
      }
    }

    return { groups, nonGoalTasks };
  }
</script>

{#if isDisableGrouping}
  <div class="flex flex-col gap-2">
    {#each tasks as item}
      <TaskThumbnail
        {item}
        {accessPoint}
        {accessPointId}
        {parentBgIndex}
        {arrangement}
        isShowGoal={accessPoint !== ResourceAccessPoint.GOAL}
        size={resolveSize(accessPoint)}
        on:click
      />
    {/each}
  </div>
{:else if tasksByGoal}
  <div class="flex flex-col gap-2">
    {#each tasksByGoal.groups.entries() as [goalId, group]}
      <div
        class="flex flex-col gap-1 pl-1 py-2 pr-1 border rounded-md border-brs2"
      >
        <div class="px-2 flex justify-between w-full">
          <TaskThumbnailGoalLabel goal={group.goal} {accessPoint} />
          <Button
            icon="plus"
            size={Size.sm}
            on:click={() => (createTaskWizardForGoal = goalId)}
          />
        </div>
        {#if createTaskWizardForGoal === goalId}
          <div class="flex w-full mb-2">
            <CreateTaskInlineWizard
              {goalId}
              {date}
              on:close={() => (createTaskWizardForGoal = undefined)}
            />
          </div>
        {/if}
        {#each group.tasks as task}
          <TaskThumbnail
            item={task}
            {accessPoint}
            {accessPointId}
            {parentBgIndex}
            {arrangement}
            size={resolveSize(accessPoint)}
            on:click
          />
        {/each}
      </div>
    {/each}
    {#each tasksByGoal.nonGoalTasks as task}
      <TaskThumbnail
        item={task}
        {accessPoint}
        {accessPointId}
        {parentBgIndex}
        {arrangement}
        isShowGoal={true}
        size={resolveSize(accessPoint)}
        on:click
      />
    {/each}
  </div>
{/if}
