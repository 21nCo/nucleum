<script lang="ts">
  import MetricItem from "@21n/products/pointron/analytics/cards/metrics/MetricItem.svelte";
  import type { ISessionLog } from "@21n/products/pointron/logs/log.type";

  export let data: ISessionLog[];
  export let previousTimePeriodData: ISessionLog[];

  const totalFocus = data.reduce((acc, curr) => acc + (curr.focus ?? 0), 0);
  const totalBreak = data.reduce((acc, curr) => acc + (curr.breakTime ?? 0), 0);
  const previousFocus = previousTimePeriodData.reduce(
    (acc, curr) => acc + (curr.focus ?? 0),
    0
  );
  const previousBreak = previousTimePeriodData.reduce(
    (acc, curr) => acc + (curr.breakTime ?? 0),
    0
  );
</script>

<div
  class="w-full flex flex-wrap justify-start items-start content-start dp:gap-4 gap-3"
>
  <MetricItem
    type="total"
    value={totalFocus + totalBreak}
    previousValue={previousFocus + previousBreak}
  />
  <MetricItem type="focus" value={totalFocus} previousValue={previousFocus} />
  <MetricItem type="break" value={totalBreak} previousValue={previousBreak} />
</div>
