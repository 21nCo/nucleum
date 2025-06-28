<script lang="ts">
  import Divider from "$lib/client/elements/Divider.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TimeScale } from "$lib/client/types/time.type";
  import CalendarOverviewPanelPointron from "./CalendarOverviewPanelPointron.svelte";
  import MemoryOverviewForTimePeriod from "./MemoryOverviewForTimePeriod.svelte";

  export let date: Date;
  export let scale: TimeScale = TimeScale.DAYS;
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
