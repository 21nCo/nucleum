<script lang="ts">
  import Chart from "$lib/client/components/charts/Chart.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import TimePeriodValueSelector from "$lib/client/elements/datetime/timeperiodpicker/RelativeTimeRangeSelector.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { ChartType } from "$lib/client/types/analytics.type";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import {
    TimeScale,
    type TimePeriod,
    TimePeriodType
  } from "$lib/client/types/time.type";
  export let timePeriod: TimePeriod;
  export let data: any;
  let options: any;
</script>

<div class="flex gap-4 w-full justify-center">
  <div class="flex flex-col items-center gap-2">
    <PanelSwitcher
      items={$userPreferences.timeScales ?? Object.keys(TimeScale)}
      style={PanelSwitcherStyle.TRAIN}
    />
    <div
      class="h-80 w-96 rounded-md bg-bgs2 text-fgs3 flex justify-center items-center"
    >
      <Chart type={ChartType.BAR} {data} {options} />
    </div>
  </div>
  <div class="flex flex-col gap-2">
    <div>Time period label</div>
    <TimePeriodValueSelector
      scale={timePeriod.scale}
      value={timePeriod.value}
    />
  </div>
</div>
