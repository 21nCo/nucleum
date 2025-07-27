<script lang="ts">
  import { parseAndFormatDate } from "$lib/client/utils/time.utils";
  import { selectedTimePeriod } from "$lib/client/stores/app.store";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Popover from "../popover/Popover.svelte";
  import AbsoluteTimeRangePopover from "./absolute/AbsoluteTimeRangePopover.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  let ref: any;
</script>

<Popover bind:this={ref}>
  <button
    class={cn("flex items-center", {
      "gap-2": size === Size.lg,
      "gap-1": size === Size.md || size === Size.sm
    })}
  >
    <Icon icon="calendar" {size} />
    <span
      class={cn("text-fgs2 underline-dotted", {
        "text-h5 font-medium": size === Size.lg,
        "text-base": size === Size.md,
        "text-b2": size === Size.sm
      })}
    >
      {parseAndFormatDate($selectedTimePeriod)}
    </span>
  </button>
  <slot:fragment slot="popover">
    <AbsoluteTimeRangePopover
      isDatePickerMode={true}
      bind:selectedDate={$selectedTimePeriod}
      on:change={() => ref.toggle()}
    />
  </slot:fragment>
</Popover>
