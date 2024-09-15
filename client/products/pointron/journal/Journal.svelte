<script lang="ts">
  import CalendarHeatMap from "$lib/client/components/calendar/calendarHeatmap/CalendarHeatMap.svelte";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import TimelineDate from "$lib/client/elements/datetime/TimelineDate.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { selectedTimePeriod } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import LogsPane from "../logs/LogsPane.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import { CalendarHmVariant } from "$lib/client/components/calendar/calendarHeatmap/calendarHeatmap.types";
  import { focusHeatmapStore } from "./journal.store";
  import TodayButton from "$lib/client/elements/button/TodayButton.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { setContext } from "svelte";

  function handleEvent(data: any) {
    if (data.type === "year-selection") {
      uiState.setState(UIState.journalYearSelection, data.year, {
        isDeviceScoped: true
      });
    }
  }
  setContext("heatmap-event", handleEvent);

  function refresh() {
    dataManager.refreshPage([
      Resource.logsPane,
      Resource.focusHeatmap,
      Resource.targetsPane
    ]);
  }
  refresh();
  const selectedHeatmapYear = uiState.getState(UIState.journalYearSelection, {
    isDeviceScoped: true
  });
</script>

{#if $view.isPortrait}
  <div class="h-full w-full flex flex-col items-start gap-6 p-4">
    <div class="flex w-full justify-between items-center">
      <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Journal" />
      <TimelineDate size={Size.lg} />
    </div>
    <LogsPane date={$selectedTimePeriod} context="journal" />
  </div>
{:else}
  <div class="w-full h-full flex gap-12">
    <div
      class="flex flex-col h-full w-[23rem] min-w-[23rem] overflow-auto px-4 py-4"
    >
      <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Journal" />
      <div class="h-[45rem] w-full">
        <CalendarHeatMap
          touchDevice={false}
          orientation={Orientation.Vertical}
          variant={CalendarHmVariant.YEARS_SWITCH}
          options={{ selectedYear: selectedHeatmapYear }}
          provider={focusHeatmapStore}
        />
      </div>
    </div>
    <div class="flex gap-8 h-full tp:p-2 p-4 flex-1">
      <div
        class="h-full w-full w--[23rem] max-w-[30rem] flex flex-col gap-4 items-start"
      >
        <div class="flex w-full justify-between">
          <TimelineDate size={Size.lg} />
          <TodayButton />
        </div>
        <LogsPane date={$selectedTimePeriod} context="journal" />
      </div>
    </div>
    <!-- <div
      class="flex flex-col bg-bgs2 border-l border-l-brs3 items-start gap-4 justify-start h-full p-4 min-w-0 flex-1"
    >
      <ComingSoonView
        mainText="Coming soon..."
        subText="We are working on something amazing. Stay tuned."
        size={Size.sm}
      />
    </div> -->
  </div>
{/if}
