<script lang="ts">
  import type { IActiveGoalStore } from "./goal.store";
  import GoalInfoPanel from "./info/GoalInfoPanel.svelte";
  import SubGoalsPanel from "./sub/SubGoalsPanel.svelte";
  import GoalHistory from "./history/GoalHistory.svelte";
  import GoalTasks from "./tasks/GoalTasks.svelte";
  import GoalAnalytics from "./GoalAnalytics.svelte";
  import PropertiesPane from "@21n/components/collection/properties/PropertiesPane.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
  import type { IInlineStatus } from "@21n/types/notification.type";

  let {
    goal,
    isConstrainedWidth = false,
    isThreeColumned = false,
    status = $bindable()
  }: {
    goal: IActiveGoalStore;
    isConstrainedWidth?: boolean;
    isThreeColumned?: boolean;
    status?: IInlineStatus | undefined;
  } = $props();

  const goalPanel = $derived($goal?.panel);
  const goalId = $derived($goal?.id);
  const isActiveResource = $derived(
    !$goal?.isArchived && !$goal?.trashInformation && !$goal?.isParentInactive
  );
</script>

<div class="cw:w-full h-full transition-all flex">
  {#if goalPanel === ResourcePanelType.OVERVIEW}
    <div class="flex flex-col min-w-96 grow gap-4 p-2 h-full">
      {#if goalId}
        <GoalTasks id={goalId} {isActiveResource} />
      {/if}
    </div>
  {:else}
    <div class="cw:p-0 p-4 grow cw:w-full">
      {#if goalPanel === ResourcePanelType.DEFAULT}
        <GoalInfoPanel {goal} {isConstrainedWidth} bind:status />
      {:else if goalPanel === ResourcePanelType.SUB}
        <SubGoalsPanel {goal} {isActiveResource} />
      {:else if goalPanel === ResourcePanelType.ACTIVITY}
        <GoalHistory {goal} />
      {:else if goalPanel === ResourcePanelType.TASKS}
        {#if goalId}
          <GoalTasks id={goalId} {isActiveResource} />
        {/if}
      {:else if goalPanel === ResourcePanelType.ANALYTICS}
        {#if goalId}
          <GoalAnalytics id={goalId} />
        {/if}
      {:else if goalPanel === ResourcePanelType.PROPERTIES}
        <div class="flex w-full justify-center">
          <div class="w-96">
            <PropertiesPane item={goal} resource={Resource.goal} />
          </div>
        </div>
      {/if}
    </div>
  {/if}
  {#if isThreeColumned && goalPanel === ResourcePanelType.OVERVIEW}
    <div class="flex flex-col bg-bgs2 border-l border-brs2 min-w-96 w-96 p-4">
      <GoalInfoPanel {goal} />
    </div>
  {/if}
</div>
