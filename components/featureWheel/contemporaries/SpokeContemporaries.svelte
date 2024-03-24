<script lang="ts">
  import type { FeatureWheelContemporary } from "$lib/tidy/types/featureWheel.type";
  import { resolveHoverState } from "$lib/tidy/utils/browser.utils";
  import Contemporary from "./Contemporary.svelte";
  export let xCoord: number;
  export let yCoord: number;
  export let contemporary: FeatureWheelContemporary;
  let isHovering = false;
  let isClicked = false;
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    isHovering = resolveHoverState(event);
  };
</script>

<foreignObject x={xCoord} y={yCoord} class="w-8 min-w-fit h-[3.5rem]">
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
      class="flex bg-bgs2 rounded-md px-1.5 py-1 text-b5"
    >
      +{contemporary.label.length}
    </button>
  {:else}
    <Contemporary label={contemporary.label} />
  {/if}
</foreignObject>

<foreignObject x={xCoord} y={yCoord + 30} class="w-72 min-w-fit h-[4.5rem]">
  {#if isHovering || isClicked}
    <div class="flex gap-2 bg-bgs2 rounded-md px-3 py-2">
      {#each contemporary.label as item (item)}
        <Contemporary label={item} />
        <!-- <span class="text-b5">{item}</span> -->
      {/each}
    </div>
  {/if}
</foreignObject>
