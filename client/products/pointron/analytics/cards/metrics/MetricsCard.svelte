<script lang="ts">
  import type {
    AnalyticsDataRecord
  } from "@21n/products/pointron/analytics/analytics.types";
  import MetricItem from "@21n/products/pointron/analytics/cards/metrics/MetricItem.svelte";

  let {
    data,
    previousTimePeriodData = []
  }: {
    data: AnalyticsDataRecord[];
    previousTimePeriodData?: AnalyticsDataRecord[];
  } = $props();

  let totalFocus = $derived(data.reduce((acc, curr) => acc + curr.focus, 0));
  let totalBreak = $derived(
    data.reduce((acc, curr) => acc + curr.brek, 0)
  );
  let total = $derived(totalFocus + totalBreak);
  let previousFocus = $derived(
    previousTimePeriodData.reduce((acc, curr) => acc + curr.focus, 0)
  );
  let previousBreak = $derived(
    previousTimePeriodData.reduce((acc, curr) => acc + curr.brek, 0)
  );
  let previousTotal = $derived(previousFocus + previousBreak);
</script>

<div
  class="w-full h-full flex flex-wrap justify-start items-start content-start dp:gap-4 gap-3"
>
  <MetricItem type="total" value={total} previousValue={previousTotal} />
  <MetricItem type="focus" value={totalFocus} previousValue={previousFocus} />
  <MetricItem type="break" value={totalBreak} previousValue={previousBreak} />
</div>
