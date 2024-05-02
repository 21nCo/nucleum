<script lang="ts">
  import { formatDate } from "$lib/tidy/utils/time.utils";
  import { selectedTimePeriod } from "$lib/tidy/stores/app.store";
  import TimePeriodPicker from "./TimePeriodPicker.svelte";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import Popover from "../popover/Popover.svelte";
  export let size: Size = Size.md;
  let ref: any;
</script>

<Popover bind:this={ref}>
  <button
    class="flex underline-dotted items-center {size === Size.lg
      ? 'gap-2'
      : 'gap-1'}"
    slot="trigger"
  >
    <Icon icon="calendar" {size} />
    <span
      class="text-fgs2 {size === Size.lg
        ? 'text-h4'
        : size === Size.md
          ? 'text-base'
          : 'text-b2'}"
    >
      {formatDate($selectedTimePeriod)}
    </span>
  </button>
  <slot:fragment slot="popover">
    <TimePeriodPicker
      isDatePickerMode={true}
      bind:selectedDate={$selectedTimePeriod}
      on:change={() => ref.toggle()}
    />
  </slot:fragment>
</Popover>
