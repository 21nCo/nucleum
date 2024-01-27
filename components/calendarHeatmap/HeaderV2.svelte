<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import {
    CalendarLayout,
    CalendarView
  } from "$lib/tidy/types/CalendarHeatMap.enum";
  import {
    fetch11years,
    fetch24years,
    fetch6months
  } from "$lib/tidy/utils/CalendarHeatMap.utils";
  import { createEventDispatcher } from "svelte";
  import {
    CalendarHeatMapLayout,
    isTouchDevice
  } from "$lib/tidy/stores/app.store";
  import { moveTouch } from "$lib/tidy/utils/touchGesture";
  let label: string[] = ["Days", "Months", "Years"];
  let activeButton: number = 0;
  function chevleft() {
    console.log("chevleft");
    if (activeButton == CalendarView.DAYS) fetch6months("prev");
    else if (activeButton == CalendarView.MONTHS) fetch11years("prev");
    else fetch24years("prev");
  }
  function chevright() {
    console.log("chevright");
    if (activeButton == CalendarView.DAYS) fetch6months("next");
    else if (activeButton == CalendarView.MONTHS) fetch11years("next");
    else fetch24years("next");
  }
  let dispatch = createEventDispatcher();
  $: {
    console.log("activeButton", activeButton);
    dispatch("viewChange", activeButton);
  }
</script>

<div
  on:touchmove={() => {
    if ($CalendarHeatMapLayout === CalendarLayout.VERTICAL)
      moveTouch(event, chevright, undefined, chevleft, undefined);
    else moveTouch(event, undefined, chevleft, undefined, chevright, undefined);
  }}
>
  <div class="flex w-full justify-center gap-x-px p-1">
    <div class="flex ml-auto">
      <Button
        on:click={() => (activeButton = CalendarView.DAYS)}
        label={label[0]}
        type={activeButton == 0 ? "primary" : "secondary"}
      />
      <Button
        on:click={() => (activeButton = CalendarView.MONTHS)}
        label={label[1]}
        type={activeButton == 1 ? "primary" : "secondary"}
      />
      <Button
        on:click={() => (activeButton = CalendarView.YEARS)}
        label={label[2]}
        type={activeButton == 2 ? "primary" : "secondary"}
      />
    </div>
    <div class="ml-auto flex">
      {#if $isTouchDevice == false}
        {#if $CalendarHeatMapLayout === CalendarLayout.VERTICAL}
          <div class="flex flex-col">
            <Button icon="chevup" on:click={chevleft} />
            <Button icon="chevdown" on:click={chevright} />
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
