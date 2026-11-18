<svelte:options runes={true} />

<script lang="ts">
  import DatePickerRow from "@21n/ui/elements/datetime/DatePickerRow.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
  import CalendarColumn from "@nucleum/features/calendar/column/CalendarColumn.svelte";
  import {
    isKeyTargetPane,
    isPlainPageKey
  } from "@nucleum/shell/shortcuts/page-keys";
  import { getContextZonePane } from "@nucleum/shell/topNav/contextZone/context-zone";
  let selectedDate = $state(new Date());
  let viewDate = $state(new Date());

  const keyPane = getContextZonePane();
  let rootRef = $state<HTMLElement | undefined>();

  /** Shift+T goes to today, as on the full-width calendar. */
  function onTodayKey(event: KeyboardEvent) {
    if (!event.shiftKey || event.key.toLowerCase() !== "t") return;
    if (!isPlainPageKey(event, { allowShift: true })) return;
    if (!isKeyTargetPane(keyPane, rootRef)) return;
    event.preventDefault();
    selectedDate = new Date();
  }
</script>

<svelte:window onkeydown={onTodayKey} />

<main bind:this={rootRef} class="flex flex-col gap-6 w-full p-4 cw:pt-16">
  <!-- <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Calendar" /> -->
  <div class="flex flex-grow w-full">
    {#key selectedDate}
      <CalendarColumn
        scale={TimeScaleUnit.DAY}
        date={selectedDate}
        isCwContext={true}
        onDateChange={(e) => {
          if (e.detail) selectedDate = e.detail;
        }}
      />
    {/key}
  </div>
</main>
