<script lang="ts">
  import AnalyticsChart from "@21n/products/pointron/analytics/page/AnalyticsChart.svelte";
  import {
    AnalyticsCardType,
    type IAnalyticsCard,
    type AnalyticsDataRecord,
    type IAnalyticsLabelColor
  } from "@21n/products/pointron/analytics/analytics.types";
  import TopNCard from "@21n/products/pointron/analytics/cards/topN/TopNCard.svelte";
  import MetricsCard from "@21n/products/pointron/analytics/cards/metrics/MetricsCard.svelte";
  import TargetGuages from "@21n/products/pointron/analytics/targets/TargetGuages.svelte";
  import { Size } from "@21n/types/size.enum";
  import view from "@21n/stores/view.store";
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
