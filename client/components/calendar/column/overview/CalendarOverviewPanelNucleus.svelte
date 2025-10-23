<script lang="ts">
  import Divider from "@21n/elements/Divider.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import CalendarOverviewPanelPointron from "@21n/components/calendar/column/overview/CalendarOverviewPanelPointron.svelte";
  import MemoryOverviewForTimePeriod from "@21n/components/calendar/column/overview/MemoryOverviewForTimePeriod.svelte";

  export let date: Date;
  export let scale: TimeScaleUnit = TimeScaleUnit.DAY;
  export let isRewind: boolean = false;
</script>

<div class="flex flex-col gap-12 w-full">
  <div class="flex flex-col gap-4 w-full">
    <Text content="Memory" style={TextStyle.PANEL_HEADING_SMALL} />
    <MemoryOverviewForTimePeriod {date} {scale} {isRewind} />
  </div>
  <Divider orientation={Orientation.Horizontal} />
  <div class="flex flex-col gap-4 w-full">
    <Text content="Focus" style={TextStyle.PANEL_HEADING_SMALL} />
    <CalendarOverviewPanelPointron {date} {isRewind} />
  </div>
</div>
