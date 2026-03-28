<script lang="ts">
  import type {
    IAnalyticsCard,
    AnalyticsDataRecord
  } from "@21n/products/pointron/analytics/analytics.types";
  import MetricItem from "@21n/products/pointron/analytics/cards/metrics/MetricItem.svelte";
  export let card: IAnalyticsCard;
  export let data: AnalyticsDataRecord[];
  export let goalColors: { label: string; color: number }[] = [];
  export let previousTimePeriodData: AnalyticsDataRecord[] = [];
  $: [card, goalColors];
  $: totalFocus = data.reduce((acc, curr) => acc + curr.focus, 0);
  $: totalBreak = data.reduce((acc, curr) => acc + curr.brek, 0);
  $: total = totalFocus + totalBreak;
  $: previousFocus = previousTimePeriodData.reduce(
    (acc, curr) => acc + curr.focus,
    0
  );
  $: previousBreak = previousTimePeriodData.reduce(
    (acc, curr) => acc + curr.brek,
    0
  );
  $: previousTotal = previousFocus + previousBreak;
</script>

<div
  class="w-full h-full flex flex-wrap justify-start items-start content-start dp:gap-4 gap-3"
>
  <MetricItem type="total" value={total} previousValue={previousTotal} />
  <MetricItem type="focus" value={totalFocus} previousValue={previousFocus} />
  <MetricItem type="break" value={totalBreak} previousValue={previousBreak} />
</div>
