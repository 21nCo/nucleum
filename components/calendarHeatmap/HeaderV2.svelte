<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { CalendarView } from "$lib/tidy/types/CalendarHeatMap.enum";
  import { createEventDispatcher } from "svelte";
  import { isTouchDevice } from "$lib/tidy/stores/app.store";
  import { moveTouch } from "$lib/tidy/utils/touchGesture";
  import PanelSwitcher from "$lib/tidy/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  export let orientation: Orientation;
  let dispatch = createEventDispatcher();
  let activeButton: CalendarView = CalendarView.DAYS;
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
        items={Object.values(CalendarView)}
        bind:selected={activeButton}
        style={PanelSwitcherStyle.ACCENT_SWITCH_MINI}
        on:switch
      />
    </div>
    <div class="ml-auto flex">
      {#if $isTouchDevice == false}
        {#if orientation === Orientation.Vertical}
          <div class="flex flex-col">
            <Button icon="chevup" size={Size.sm} on:click={chevleft} />
            <Button icon="chevdown" size={Size.sm} on:click={chevright} />
          </div>
        {:else}
          <div class="self-center">
            <Button icon="chevleft" on:click={chevleft} />
          </div>
          <div class="self-center mr-2">
            <Button icon="chevright" on:click={chevright} />
          </div>
        {/if}
      {/if}
    </div>
  </div>
  <slot />
</div>
