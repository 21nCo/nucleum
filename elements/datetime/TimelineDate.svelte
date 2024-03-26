<script lang="ts">
  import { formatDate } from "$lib/tidy/utils/time.utils";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { selectedTimePeriod } from "$lib/tidy/stores/app.store";
  import TimePeriodPicker from "./TimePeriodPicker.svelte";
  import { renderPopoverv2 } from "$lib/tidy/utils/browser.utils";
  import { onMount } from "svelte";
  import { Direction } from "$lib/tidy/types/direction.enum";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import { generateUID } from "$lib/tidy/utils/utils";
  export let size: Size = Size.md;
  let isShowDateSelector: boolean = false;
  let pickerRef: HTMLDivElement;
  let labelRef: HTMLButtonElement;
  let containerId = generateUID();
  onMount(() => {
    hidePicker();
  });
  function togglePicker() {
    isShowDateSelector = !isShowDateSelector;
    if (isShowDateSelector && pickerRef) {
      renderPopoverv2(labelRef, pickerRef, Direction.Down);
    } else {
      hidePicker();
    }
  }
  function hidePicker() {
    isShowDateSelector = false;
    pickerRef.style.display = "none";
  }
</script>

<button
  bind:this={labelRef}
  id={containerId}
  class="flex items-center {size === Size.lg ? 'gap-2' : 'gap-1'}"
  on:click={() => {
    togglePicker();
  }}
>
  <Icon icon="calendar" {size} />
  <!-- <Text
    content={formatDate($selectedTimePeriod)}
    style={TextStyle.PANEL_HEADING_SMALL}
  /> -->
  <span
    class="text-fgs2 underline-dotted {size === Size.lg
      ? 'text-h4'
      : size === Size.md
        ? 'text-base'
        : 'text-b2'}"
  >
    {formatDate($selectedTimePeriod)}
  </span>
</button>
<div bind:this={pickerRef}>
  <TimePeriodPicker
    isDatePickerMode={true}
    srcId={containerId}
    bind:selectedDate={$selectedTimePeriod}
    on:change={(e) => {
      togglePicker();
    }}
    on:close={hidePicker}
  />
</div>
