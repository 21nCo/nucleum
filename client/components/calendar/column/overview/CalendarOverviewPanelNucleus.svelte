<script lang="ts">
  import { TimeScaleUnit } from "@21n/types/time.type";
  import CalendarOverviewPanelPointron from "@21n/components/calendar/column/overview/CalendarOverviewPanelPointron.svelte";
  import MemoryOverviewForTimePeriod from "@21n/components/calendar/column/overview/MemoryOverviewForTimePeriod.svelte";

  export let date: Date;
  export let scale: TimeScaleUnit = TimeScaleUnit.DAY;
  export let isRewind: boolean = false;
</script>

<!-- TODO - combined query for all data -->
<div class="flex flex-col gap-4 w-full">
  <MemoryOverviewForTimePeriod {date} {scale} {isRewind} />
  <CalendarOverviewPanelPointron {date} {isRewind} />
</div>
