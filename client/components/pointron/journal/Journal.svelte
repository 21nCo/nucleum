<script lang="ts">
  import CalendarHeatMap from "$lib/client/components/calendarHeatmap/CalendarHeatMap.svelte";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import TimelineDate from "$lib/client/elements/datetime/TimelineDate.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { selectedTimePeriod } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import LogsPane from "../logs/LogsPane.svelte";
  import { dataManager } from "$lib/client/stores/data.store";
  import { Item } from "$lib/client/types/item.enum";
  import { CalendarHmVariant } from "$lib/client/components/calendarHeatmap/calendarHeatmap.types";
  import { focusHeatmapStore } from "./journal.store";
  import TodayButton from "$lib/client/elements/button/TodayButton.svelte";
  function refresh() {
    dataManager.refreshPage([
      Item.logsPane,
      Item.focusHeatmap,
      Item.targetsPane
    ]);
  }
  refresh();
</script>

{#if $view.isPortrait}
  <div class="h-full w-full flex flex-col items-start gap-4 p-2 px-4">
    <div class="flex w-full justify-between items-center">
      <!-- <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Journal" /> -->
      <TimelineDate size={Size.md} />
      <TodayButton />
    </div>
    <LogsPane date={$selectedTimePeriod} context="journal" />
  </div>
{:else}
  <div class="w-full h-full flex gap-12">
    <div class="flex flex-col h-full w-[23rem] overflow-auto px-4 py-4">
      <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Journal" />
      <div class="h-[45rem] w-full">
        <CalendarHeatMap
          touchDevice={false}
          orientation={Orientation.Vertical}
          variant={CalendarHmVariant.PLAIN}
          provider={focusHeatmapStore}
        />
      </div>
    </div>
    <div class="flex gap-8 h-full py-4">
      <div class="h-full w-[23rem] flex flex-col gap-4 items-start">
        <div class="flex w-full justify-between">
          <TimelineDate size={Size.lg} />
          <TodayButton />
        </div>
        <LogsPane date={$selectedTimePeriod} context="journal" />
      </div>
    </div>
    <div
      class="flex flex-col bg-bgs2 border-l border-l-brs3 items-start gap-4 justify-start h-full flex-grow p-4"
    >
      <Text style={TextStyle.PANEL_HEADING_SMALL} content="Timeline" />
      <ComingSoonView
        mainText="Landing soon..."
        subText="We are hard at work to build this feature. Stay tuned."
        size={Size.sm}
      />
      <!-- <TargetGuages size={Size.md} /> -->
    </div>
  </div>
{/if}
