<script lang="ts">
  import { type IActiveGoalStore } from "$lib/client/components/goals/goal.store";
  import GoalCollectionsRow from "../GoalCollectionsRow.svelte";
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import GoalTitleRow from "./GoalTitleRow.svelte";
  import GoalStatusSwitcher from "../status/GoalStatusSwitcher.svelte";
  import { GoalStatus, GoalType } from "../goal.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import TimelineCard from "./TimelineCard.svelte";
  import RecordStatusBanner from "../../record/RecordStatusBanner.svelte";
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import { isSameResource } from "../../flux/resourceStores/resource.utils";
  export let goal: IActiveGoalStore;
  export let isConstrainedWidth = false;
  function handleStatusChange(e: CustomEvent<GoalStatus>) {
    $goal.status = e.detail;
    goal.modify({
      status: e.detail
    });
  }
  $: isCurrentlyFocusing =
    $activeSession.currentFocusItem &&
    isSameResource(goal, $activeSession.currentFocusItem) &&
    $activeSession.isQuickStartOn &&
    $activeSession.isSessionRunning;
</script>

<div
  class={cn("flex flex-col gap-6", {
    "bg-bgs2 rounded-md p-3 h-full": isConstrainedWidth
  })}
>
  <div class="flex flex-col gap-2">
    {#if !isConstrainedWidth}
      <GoalTitleRow {goal} />
    {/if}
    <div class="flex flex-col gap-1">
      {#if isConstrainedWidth}
        <span class="text-b2 text-fgs3">Collections</span>
      {/if}
      <GoalCollectionsRow task={goal} />
    </div>
  </div>
  <RecordStatusBanner resource={goal} />
  {#if isCurrentlyFocusing}
    Currently focusing...
  {/if}
  <div class="flex flex-col gap-1">
    <span class="text-b2 text-fgs3">Status</span>
    <GoalStatusSwitcher status={$goal.status} on:change={handleStatusChange} />
  </div>
  {#if $goal.type === GoalType.DEFINITE}
    <TimelineCard {goal} />
  {/if}

  {#if $goal.description}
    <div>
      <span class="text-b2 text-fgs3">Description</span>
      <Markdown md={$goal.description} />
    </div>
  {/if}
</div>
