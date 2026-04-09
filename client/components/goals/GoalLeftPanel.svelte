<script lang="ts">
  import { type IActiveGoalStore } from "@21n/components/goals/goal.store";
  import GoalCollectionsRow from "@21n/components/goals/GoalCollectionsRow.svelte";
  import GoalTitleRow from "@21n/components/goals/info/GoalTitleRow.svelte";
  import { SubGoalsLayout } from "@21n/components/goals/goal.type";
  import { cn } from "@21n/utils/ui.utils";
  import { type IInlineStatus } from "@21n/types/notification.type";
  import SubGoalsPanel from "@21n/components/goals/sub/SubGoalsPanel.svelte";

  let {
    goal,
    isConstrainedWidth = false,
    status = $bindable()
  }: {
    goal: IActiveGoalStore;
    isConstrainedWidth?: boolean;
    status?: IInlineStatus | undefined;
  } = $props();
</script>

<div
  class={cn("relative flex flex-col gap-6 h-full", {
    "rounded-md p-3": isConstrainedWidth
  })}
>
  <div class="flex flex-col gap-2 px-3 pt-3 w-full h-fit">
    {#if !isConstrainedWidth}
      <GoalTitleRow {goal} bind:status />
    {/if}
    <div class="flex flex-col gap-1">
      {#if isConstrainedWidth}
        <span class="text-b2 text-fgs3">Collections</span>
      {/if}
      {#if !$goal.isInEditMode}
        <GoalCollectionsRow {goal} />
      {/if}
    </div>
  </div>
  <div
    class={cn({
      "px-3": $goal.subGoalsLayout === SubGoalsLayout.STEPS
    })}
  >
    <SubGoalsPanel {goal} />
  </div>
</div>
