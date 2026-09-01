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
  import { truncateString } from "@21n/shared-utils/text.utils";

  let {
    tasks,
    accessPoint,
    accessPointId = undefined,
    parentBgIndex,
    arrangement,
    isDisableGrouping = false,
    date = undefined
  }: {
    tasks: ITaskThumb[];
    accessPoint: ResourceAccessPoint;
    accessPointId?: IRecordId | undefined;
    parentBgIndex: number;
    arrangement: Arrangement;
    isDisableGrouping?: boolean;
    date?: Date | undefined;
  } = $props();

  let createTaskWizardForGoal = $state<IRecordId | undefined>(undefined);
  const tasksByGoal = $derived(isDisableGrouping ? null : groupTasksByGoal(tasks));

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
    {#each tasks as item (item.id)}
      <TaskThumbnail
        {item}
        {accessPoint}
        {accessPointId}
        {parentBgIndex}
        {arrangement}
        isShowGoal={accessPoint !== ResourceAccessPoint.GOAL}
        size={resolveSize(accessPoint)}
      />
    {/each}
  </div>
{:else if tasksByGoal}
  <div class="flex flex-col gap-2">
    {#each [...tasksByGoal.groups.entries()] as [goalId, group] (goalId)}
      <div
        class="flex flex-col gap-1 pl-1 py-2 pr-1 border rounded-md border-brs2"
      >
        <div class="px-2 flex justify-between w-full">
          <div class="flex flex-1 min-w-0">
            <TaskThumbnailGoalLabel goal={group.goal} {accessPoint} />
          </div>
          <Button
            icon="plus"
            tooltip={`Create task for ${truncateString(group.goal.label, 20)}`}
            size={Size.sm}
            onclick={() => (createTaskWizardForGoal = goalId)}
          />
        </div>
        {#if createTaskWizardForGoal === goalId}
          <div class="flex w-full mb-2">
            <CreateTaskInlineWizard
              {goalId}
              {date}
              onClose={() => (createTaskWizardForGoal = undefined)}
            />
          </div>
        {/if}
        {#each group.tasks as task (task.id)}
          <TaskThumbnail
            item={task}
            {accessPoint}
            {accessPointId}
            {parentBgIndex}
            {arrangement}
            size={resolveSize(accessPoint)}
          />
        {/each}
      </div>
    {/each}
    {#each tasksByGoal.nonGoalTasks as task (task.id)}
      <TaskThumbnail
        item={task}
        {accessPoint}
        {accessPointId}
        {parentBgIndex}
        {arrangement}
        isShowGoal={true}
        size={resolveSize(accessPoint)}
      />
    {/each}
  </div>
{/if}
