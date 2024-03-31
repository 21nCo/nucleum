<script lang="ts">
  import type { FeatureWheelContemporary } from "$lib/tidy/types/featureWheel.type";
  import { resolveHoverState } from "$lib/tidy/utils/browser.utils";
  import Contemporary from "./Contemporary.svelte";
  export let xCoord: number;
  export let yCoord: number;
  export let contemporary: FeatureWheelContemporary;
  export const width = 12;
  let isHovering = false;
  let isClicked = false;
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
  class="w-6 min-w-fit h-[3rem]"
>
  {#if Array.isArray(contemporary.label)}
    <button
      on:click={() => {
        isClicked = !isClicked;
        if (!isClicked) isHovering = false;
        // runAction(AppEvent.CMD);
      }}
      on:mouseover={toggleHoveringState}
      on:mouseout={toggleHoveringState}
      on:focus={toggleHoveringState}
      on:blur={toggleHoveringState}
      class="flex bg-bgs2 rounded-md px-1 py-0.5 text-[0.33rem]"
    >
      +{contemporary.label.length}
    </button>
  {:else}
    <Contemporary {width} label={contemporary.label} />
  {/if}
</foreignObject>

<foreignObject
  x={xCoordAdjusted}
  y={yCoordAdjusted}
  class="w-72 min-w-fit h-[4.5rem]"
>
  {#if isHovering || isClicked}
    <div class="flex gap-2 bg-bgs2 rounded-md px-3 py-2">
      {#each contemporary.label as item (item)}
        <Contemporary {width} label={item} />
        <!-- <span class="text-b5">{item}</span> -->
      {/each}
    </div>
  {/if}
</foreignObject>
