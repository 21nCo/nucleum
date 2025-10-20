<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import FormElement from "@21n/elements/FormElement.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { popover } from "@21n/actions/popover.action";
  import AbsoluteTimeRangePopoverV2 from "@21n/elements/datetime/absolute/AbsoluteTimeRangePopoverV2.svelte";
  const dispatch = createEventDispatcher();
  export let parentBackgroundIndex: number = 1;
  export let initialStartDate: Date | null = null;
  export let initialEndDate: Date | null = null;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  let isPopoverVisible: boolean = false;

  function isValidDate(date: Date | null): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  function handleRangeChange(val: { start: string; end: string }) {
    dispatch("change", val);
  }
</script>

<FormElement {style} {label} isFocused={isPopoverVisible}>
  <div
    class={cn("flex items-center gap-2 p-2 w-full", {})}
    use:popover={{
      content: AbsoluteTimeRangePopoverV2,
      id: "time-range-picker-popover",
      isRenderAsModalForCW: true,
      componentProps: {
        initialStartDate,
        initialEndDate,
        onRangeChange: handleRangeChange
      }
    }}
    on:change={(e) => {
      isPopoverVisible = e.detail?.open;
    }}
  >
    <Icon icon="calendar" size={Size.md} />
    {#if isValidDate(initialStartDate) && isValidDate(initialEndDate)}
      <span class="text-fgs2 text-base">
        {parseAndFormatDate(initialStartDate)} - {parseAndFormatDate(
          initialEndDate
        )}
      </span>
    {:else}
      <span class="text-fgs2 text-b2">Select start and end date</span>
    {/if}
  </div>
</FormElement>
