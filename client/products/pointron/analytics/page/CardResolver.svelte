<script lang="ts">
  import AnalyticsChart from "./AnalyticsChart.svelte";
  import {
    AnalyticsCardType,
    type IAnalyticsCard,
    type AnalyticsDataRecord,
    type IAnalyticsLabelColor
  } from "../analytics.types";
  import TopNCard from "../cards/topN/TopNCard.svelte";
  import MetricsCard from "../cards/metrics/MetricsCard.svelte";
  import TargetGuages from "../targets/TargetGuages.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import view from "$lib/client/stores/view.store";
  export let card: IAnalyticsCard;
  export let data: AnalyticsDataRecord[];
  export let parentBgIndex: number = 1;
  export let previousTimePeriodData: AnalyticsDataRecord[] = [];
  export let goalColors: IAnalyticsLabelColor[];
</script>

{#if card.type === AnalyticsCardType.PIE || card.type === AnalyticsCardType.DONUT || card.type === AnalyticsCardType.AREA || card.type === AnalyticsCardType.LINE || card.type === AnalyticsCardType.BAR}
  <AnalyticsChart chart={card} rawData={data} {goalColors} />
{:else}
  <div
    class="flex self-start w-full h-full mo:p-0.5 p-3 overflow-auto userdata"
  >
    {#if card.type === AnalyticsCardType.TOP_N}
      <TopNCard {card} {data} {goalColors} {previousTimePeriodData} />
    {:else if card.type === AnalyticsCardType.TARGETS}
      <div class="w-full h-full flex items-center">
        <TargetGuages
          size={$view.isPortrait ? Size.md : Size.lg}
          {parentBgIndex}
          type="full"
        />
      </div>
    {:else if card.type === AnalyticsCardType.METRICS}
      <MetricsCard {card} {data} {goalColors} {previousTimePeriodData} />
    {/if}
  </div>
{/if}
