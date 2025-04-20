<script lang="ts">
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import GoalSearchResultItem from "$lib/client/components/goals/GoalSearchResultItem.svelte";
  import {
    GoalStatus,
    type IGoalThumb
  } from "$lib/client/components/goals/goal.type";
  import {
    isSameResource,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Icon from "$lib/client/elements/Icon.svelte";

  export let selectedGoals: IGoalThumb[] = [];
  let searchStore = new SearchStore(Resource.goal);
  let label: string = "";
  let inputRef: any;

  async function searchCallback(searchQuery: string) {
    const result = await searchStore.select({
      searchQuery,
      isIncludeSubItems: true,
      filters: {
        status: {
          notEquals: GoalStatus.COMPLETED
        }
      }
    });
    return result;
  }

  function onGoalSelect(goal: IGoalThumb) {
    if (!selectedGoals.some(resourceInList(goal))) {
      selectedGoals = [...selectedGoals, goal];
    }
    label = "";
  }

  function removeGoal(goalId: IRecordId) {
    selectedGoals = selectedGoals.filter((g) => !isSameResource(g, goalId));
  }
</script>

<div class="flex flex-col gap-2">
  <TextSearchInput
    on:focus
    on:blur
    on:select={(e) => onGoalSelect(e?.detail?.item)}
    label={{
      label: "Preset goals (Optional)",
      tooltip: {
        body: "Goals added in a preset will be automatically added to the focus session when the preset is selected."
      }
    }}
    bind:value={label}
    bind:this={inputRef}
    searchResultComponent={GoalSearchResultItem}
    {searchCallback}
    style={InputStyle.BORDERED}
    placeholder="Start typing to search for goals"
  />
  {#if selectedGoals.length > 0}
    <div class="flex items-center flex-wrap gap-3">
      {#each selectedGoals as goal}
        <CustomColorPropagator
          color={resolveGoalColor(goal)}
          class="flex items-center gap-2 border border-ccs1 rounded-md px-2 py-1 text-ccs1 bg-ccs5 hover:bg-ccs4"
        >
          <span>{goal.label || "Untitled"}</span>
          <Icon
            icon="ph:x-light"
            class="text-ccs1 hover:text-ccs2"
            on:click={() => removeGoal(goal.id)}
          />
        </CustomColorPropagator>
      {/each}
    </div>
  {/if}
</div>
