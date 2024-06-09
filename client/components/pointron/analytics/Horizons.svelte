<script lang="ts">
  import {
    pointronEvents,
    pointronPreferences
  } from "$lib/client/components/pointron/pointron.store";
  import view from "$lib/client/stores/view.store";
  import { borderClass } from "$lib/client/utils/theme.utils";
  import { onMount } from "svelte";
  import HorizonChart from "./page/AnalyticsChart.svelte";
  import { AnalyticsPersistence } from "$lib/client/components/pointron/analytics/analytics.persistence";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import type { HorizonChartDataRecord } from "$lib/client/types/pointron/analytics.type";
  import appearance from "$lib/client/stores/appearance.store";
  export let chartData:
    | {
        charts: HorizonChartDataRecord[][];
        colors: { label: string; color: number }[];
      }
    | undefined = undefined;
  const aggPersistance = new AnalyticsPersistence();
  onMount(async () => {
    const eventSub = pointronEvents.subscribe(async (x) => {
      if (x.event === PointronEventEnum.REFRESH_HORIZON_CHARTS) {
        await refresh();
      }
    });
    if (!chartData) {
      await refresh();
    }
    return () => {
      eventSub();
    };
  });
  async function refresh() {
    chartData = await aggPersistance.fetchAnalytics(
      $pointronPreferences.horizonCharts
    );
  }
  //$: {
  // console.log({ testing: $userLocalPreferences.horizonCharts });
  // }
</script>

{#if chartData}
  {#if $view.isPortrait}
    <div class="w-full flex flex-col gap-2">
      {#each $pointronPreferences.horizonCharts as chart, index ({ chart })}
        <div
          class="w-full min-h-[24rem] border-b border-bgs3 {index == 3
            ? 'mb-32'
            : ''}"
        >
          <HorizonChart
            {chart}
            rawData={chartData.charts[index]}
            goalColors={chartData.colors}
          />
        </div>
      {/each}
    </div>
  {:else}
    <div class="grow w-full flex flex-wrap">
      {#each $pointronPreferences.horizonCharts as chart, index ({ chart })}
        <div
          class="w-1/2 h-1/2 min-h-1/2 max-h-96 {index == 0 || index === 2
            ? `border-r ${borderClass($appearance)}`
            : ''} {index == 0 || index === 1
            ? `border-b ${borderClass($appearance)}`
            : ''}"
        >
          <HorizonChart
            {chart}
            rawData={chartData.charts[index]}
            goalColors={chartData.colors}
          />
        </div>
      {/each}
    </div>
  {/if}
{/if}
