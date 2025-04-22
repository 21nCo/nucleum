<script lang="ts">
  import type { ISessionThumb } from "./log.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  export let session: ISessionThumb;
</script>

<div class="flex flex-col w-full">
  {#if session.expandedItems && session.expandedItems.length > 0}
    {#each session.expandedItems as item}
      {@const resourceType = determineResourceType(item.id)}
      {#if resourceType === Resource.goal}
        <CustomColorPropagator
          color={resolveGoalColor(item)}
          class="flex w-full gap-2 text-base items-center"
        >
          <div class="w-2 h-2 rounded-sm bg-ccs1" />
          <div class="text-left mo:text-b2 text-ccs1 truncate w-4/5">
            <!-- {truncateString(goal.label, $view.isPortrait ? 20 : 25)} -->
            {item.label}
          </div>
        </CustomColorPropagator>
      {/if}
    {/each}
  {:else}
    <div class="text-b4 text-fgs2 font-medium">NO GOALS</div>
  {/if}
</div>
