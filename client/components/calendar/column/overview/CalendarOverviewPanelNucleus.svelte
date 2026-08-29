<script lang="ts">
  import { TimeScaleUnit } from "@21n/types/time.type";
  import CalendarOverviewPanelPointron from "@21n/components/calendar/column/overview/CalendarOverviewPanelPointron.svelte";

  let {
    date,
    scale = TimeScaleUnit.DAY,
    isRewind = false
  }: {
    date: Date;
    scale?: TimeScaleUnit;
    isRewind?: boolean;
  } = $props();
</script>

<!-- TODO - combined query for all data and include memory overview -->
<div class="flex flex-col gap-4 w-full">
  <CalendarOverviewPanelPointron {date} {isRewind} />
</div>
