<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import GoalSearchResultItem from "@21n/components/goals/GoalSearchResultItem.svelte";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";

  let { item }: { item: IGoalThumb | ITaskThumb } = $props();
  let goalItem: IGoalThumb | undefined = undefined;

  function resolveGoalItem(item: IGoalThumb | ITaskThumb) {
    if (determineResourceType(item.id) !== Resource.goal) return undefined;
    return item as IGoalThumb;
  }

  let goalItemDerived = $derived(resolveGoalItem(item));
</script>

{#if goalItemDerived}
  <GoalSearchResultItem item={goalItemDerived} />
{:else}
  <div class="flex w-full justify-between text-start">
    <span>{item.label}</span>
    <span class="text-b3 text-fgs3 rounded-md bg-bgs2 px-2 py-0.5 h-fit"
      >Task</span
    >
  </div>
{/if}
