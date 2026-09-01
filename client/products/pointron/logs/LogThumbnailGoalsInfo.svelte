<script lang="ts">
  import type { ISessionThumb } from "@21n/products/pointron/logs/log.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import { resolveGoalColor } from "@21n/components/goals/goal.utils";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";

  let { session }: { session: ISessionThumb } = $props();

  function resolveExpandedGoal(item: ISessionThumb["expandedItems"][number]) {
    if (determineResourceType(item.id) !== Resource.goal) return undefined;
    return item as unknown as IGoalThumb;
  }
</script>

<div class="flex flex-col w-full">
  {#if session.expandedItems && session.expandedItems.length > 0}
    {#each session.expandedItems as item}
      {@const resourceType = determineResourceType(item.id)}
      {#if resourceType === Resource.goal}
        <CustomColorPropagator
          color={resolveGoalColor(resolveExpandedGoal(item))}
          class="flex w-full gap-2 text-base items-center"
        >
          <div class="w-2 h-2 rounded-sm bg-ccs1" />
          <div class="text-left text-b2 text-ccs1 truncate w-4/5">
            {item.label}
          </div>
        </CustomColorPropagator>
      {/if}
    {/each}
  {:else}
    <div class="text-b4 text-fgs2 font-medium">NO GOALS</div>
  {/if}
</div>
