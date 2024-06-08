<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import SubGoalListItem from "./SubGoalListItem.svelte";
  import { currentGoal } from "$lib/client/components/pointron/goals/goal.store";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import AddNewSubGoal from "./AddNewSubGoal.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Item } from "$lib/client/types/item.enum";

  let isArchivedGoalsVisible: boolean = false;

  function toggleArchivedVisibility() {
    isArchivedGoalsVisible = !isArchivedGoalsVisible;
  }
  $: archivedSubgoals = $currentGoal.subGoals.filter(
    (item) => item.isArchived && item
  );
</script>

<div class="flex flex-col gap-4 items-start bg-bgs2 rounded-md p-4">
  <Text content="Sub goals" style={TextStyle.PANEL_HEADING_SMALL} />
  <div class="flex flex-col gap-4 w-full">
    {#if isValidArrayWithData($currentGoal.subGoals)}
      <div class="flex flex-col w-full">
        {#each $currentGoal.subGoals.filter((item) => !item.isArchived && item) as item}
          <SubGoalListItem
            on:click={() => appStore.gotoResource(Item.goal, item.id)}
            >{item.label}
          </SubGoalListItem>
        {/each}
      </div>
      {#if archivedSubgoals.length > 0}
        <Divider />
        <div class="flex flex-col w-full">
          <Text
            content="Archived sub goals"
            style={TextStyle.SECTION_HEADING_SMALL}
          />
          {#each archivedSubgoals as item}
            <SubGoalListItem
              on:click={() => appStore.gotoResource(Item.goal, item.id)}
              >{item.label}
            </SubGoalListItem>
          {/each}
        </div>
      {/if}
    {:else}
      <EmptyStatusView subText="No sub goals found" size={Size.sm} />
    {/if}
    <div class="flex flex-col">
      <Divider colorStrength={ColorStrength.Strong} />
      <AddNewSubGoal />
    </div>
  </div>

  {#if $currentGoal.archivedSubGoalCount > 0}
    <button
      on:click={toggleArchivedVisibility}
      class="cursor-pointer flex items-center gap-2 py-3 m-auto mt-5"
    >
      <h3 class="text-fgs3 uppercase text-b2">
        {isArchivedGoalsVisible ? `HIDE` : "SHOW"} Archived ( {$currentGoal.archivedSubGoalCount}
        goals )
      </h3>
      <div
        class={`inverted-triangle-path w-2.5 h-2 bg-fgs3 ${
          isArchivedGoalsVisible ? `rotate-[180deg]` : ``
        }`}
      />
    </button>
  {/if}
  {#if isArchivedGoalsVisible}
    <div class="flex flex-col w-full">
      {#each $currentGoal.subGoals.filter((item) => item.isArchived && item) as item}
        <SubGoalListItem
          on:click={() => appStore.gotoResource(Item.goal, item.id)}
          >{item.label}
        </SubGoalListItem>
      {/each}
    </div>
  {/if}
</div>

<style>
  .inverted-triangle-path {
    clip-path: polygon(0% 0%, 50% 100%, 100% 0%);
  }
</style>
