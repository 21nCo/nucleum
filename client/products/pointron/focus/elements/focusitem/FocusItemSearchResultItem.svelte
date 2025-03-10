<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import GoalSearchResultItem from "$lib/client/components/goals/GoalSearchResultItem.svelte";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";

  export let item: IGoalThumb | ITaskThumb;
  $: isGoal = determineResourceType(item.id) === Resource.goal;
</script>

{#if isGoal}
  <GoalSearchResultItem {item} />
{:else}
  <div class="flex w-full justify-between text-start">
    <span>{item.label}</span>
    <span class="text-b3 text-fgs3 rounded-md bg-bgs2 px-2 py-0.5 h-fit"
      >Task</span
    >
  </div>
{/if}
