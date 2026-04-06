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
    status = $bindable(undefined)
  }: {
    goal: IActiveGoalStore;
    isConstrainedWidth?: boolean;
    isThreeColumned?: boolean;
    status?: IInlineStatus | undefined;
  } = $props();

  const isActiveResource = $derived(
    !$goal?.isArchived && !$goal?.trashInformation && !$goal?.isParentInactive
  );
</script>

<div class="cw:w-full h-full transition-all flex">
  {#if $goal.panel === ResourcePanelType.OVERVIEW}
    <div class="flex flex-col min-w-96 grow gap-4 p-2 h-full">
      <GoalTasks id={$goal.id} {isActiveResource} />
    </div>
  {:else}
    <div class="cw:p-0 p-4 grow cw:w-full">
      {#if $goal.panel === ResourcePanelType.DEFAULT}
        <GoalInfoPanel {goal} {isConstrainedWidth} bind:status />
      {:else if $goal.panel === ResourcePanelType.SUB}
        <SubGoalsPanel {goal} {isActiveResource} />
      {:else if $goal.panel === ResourcePanelType.ACTIVITY}
        <GoalHistory {goal} />
      {:else if $goal.panel === ResourcePanelType.TASKS}
        <GoalTasks id={$goal.id} {isActiveResource} />
      {:else if $goal.panel === ResourcePanelType.ANALYTICS}
        <GoalAnalytics id={$goal.id} />
      {:else if $goal.panel === ResourcePanelType.PROPERTIES}
        <div class="flex w-full justify-center">
          <div class="w-96">
            <PropertiesPane item={goal} resource={Resource.goal} />
          </div>
        </div>
      {/if}
    </div>
  {/if}
  {#if isThreeColumned && $goal.panel === ResourcePanelType.OVERVIEW}
    <div class="flex flex-col bg-bgs2 border-l border-brs2 min-w-96 w-96 p-4">
      <GoalInfoPanel {goal} />
    </div>
  {/if}
</div>
