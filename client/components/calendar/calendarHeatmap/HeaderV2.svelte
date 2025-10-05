<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { TileScale } from "./calendarHeatmap.types";
  import { createEventDispatcher } from "svelte";
  import { isTouchDevice } from "$lib/client/stores/app.store";
  import { moveTouch } from "$lib/client/utils/touchGesture";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { Orientation } from "$lib/client/types/direction.enum";
  export let orientation: Orientation;
  let dispatch = createEventDispatcher();
  let activeButton: TileScale = TileScale.DAYS;
  function chevleft() {
    dispatch("prev");
  }
  function chevright() {
    dispatch("next");
  }
</script>

<div
  on:touchmove={() => {
    if (orientation === Orientation.Vertical)
      moveTouch(event, chevright, undefined, chevleft, undefined);
    else moveTouch(event, undefined, chevleft, undefined, chevright, undefined);
  }}
>
  <div class="flex w-full justify-center items-center gap-x-px p-1">
    <div class="flex ml-auto">
      <PanelSwitcher
        items={Object.values(TileScale)}
        bind:value={activeButton}
        size={Size.sm}
        style={PanelSwitcherStyle.TRAIN}
        on:switch
      />
    </div>
    <div class="ml-auto flex">
      {#if $isTouchDevice == false}
        {#if orientation === Orientation.Vertical}
          <div class="flex flex-col">
            <Button icon="chevron-up" size={Size.sm} on:click={chevleft} />
            <Button icon="chevron-down" size={Size.sm} on:click={chevright} />
          </div>
        {:else}
          <div class="self-center">
            <Button icon="chevron-left" on:click={chevleft} />
          </div>
          <div class="self-center mr-2">
            <Button icon="chevron-right" on:click={chevright} />
          </div>
        {/if}
      {/if}
    </div>
  </div>
  <slot />
</div>
