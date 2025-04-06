<script lang="ts">
  import type { IGoal } from "../goals/goal.type";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { resolveResourceIcon } from "../flux/resourceStores/resource.utils";
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let goal: IGoal;
  export let isCreateContext: boolean = false;
</script>

<CustomColorPropagator color={goal.color}>
  <button
    class={cn("flex items-center gap-1 text-ccs1 w-full", {
      "text-b3 cursor-default": !isCreateContext
    })}
    on:click
  >
    {#if isCreateContext}
      <Icon
        icon={resolveResourceIcon(Resource.goal)}
        size={Size.sm}
        class="text-ccs1"
      />
    {/if}
    <div class="text-left truncate flex-1 min-w-0">
      {goal.label}
    </div>
  </button>
</CustomColorPropagator>
