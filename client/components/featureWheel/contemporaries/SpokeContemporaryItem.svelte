<script lang="ts">
  import type { IFeatureWheelContemporary } from "$lib/client/types/featureWheel.type";
  import { Size } from "$lib/client/types/size.enum";
  import { resolveHoverState } from "$lib/client/utils/browser.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import Contemporary from "./Contemporary.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let xCoord: number;
  export let yCoord: number;
  export let group: IFeatureWheelContemporary[] = [];
  export let contemporary: IFeatureWheelContemporary | undefined = undefined;
  export let size: Size = Size.md;
  $: width = size === Size.sm ? 13 : size === Size.md ? 16 : 20;
  let isHovering = false;
  let isClicked = false;
  const dev_isEnableExpandForGroup = false;
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    isHovering = resolveHoverState(event);
  };
  /**
   * Adjust the x and y coordinates to center the line by offseting the width and height - as by default the logo's top left corner is placed at the x and y coordinates.
   */
  $: xCoordAdjusted = xCoord - width / 2;
  $: yCoordAdjusted = yCoord - width / 2;
</script>

<foreignObject
  x={xCoordAdjusted}
  y={yCoordAdjusted}
  class={cn("min-w-fit min-h-fit", {
    "h-3 w-3 h--[3rem]": size === Size.sm,
    "h-4 w-4": size === Size.md
  })}
>
  {#if group && group.length > 0}
    <button
      on:click={() => {
        isClicked = !isClicked;
        if (!isClicked) isHovering = false;
        dispatch("contemporary", group);
      }}
      on:mouseover={toggleHoveringState}
      on:mouseout={toggleHoveringState}
      on:focus={toggleHoveringState}
      on:blur={toggleHoveringState}
      class="flex bg-bgs2 rounded-md px-1 p-[1.5px] text-[0.33rem] border-[0.5px] border-brs3"
    >
      {group.length}
    </button>
  {:else if contemporary}
    <button
      on:click={() => {
        dispatch("contemporary", contemporary);
      }}
      class="flex"
    >
      <Contemporary {width} {contemporary} />
    </button>
  {/if}
</foreignObject>

{#if isClicked && group && dev_isEnableExpandForGroup}
  <foreignObject
    x={xCoordAdjusted + 10}
    y={yCoordAdjusted + 10}
    class="w-72 min-w-fit h-[4.5rem]"
  >
    <div class="flex gap-2 bg-bgs1 rounded-md px-3 py-2">
      {#each group as item}
        <Contemporary {width} contemporary={item} />
      {/each}
    </div>
  </foreignObject>
{/if}
