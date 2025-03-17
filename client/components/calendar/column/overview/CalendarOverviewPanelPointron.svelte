<script lang="ts">
  import OverviewCardsPulse from "$lib/client/elements/feedback/animations/DashboardPulse/OverviewCardsPulse.svelte";
  import MetricItem from "$lib/client/products/pointron/analytics/cards/metrics/MetricItem.svelte";
  import { sessionLogStore } from "$lib/client/products/pointron/logs/log.store";
  import type { ISessionLog } from "$lib/client/products/pointron/logs/log.type";
  import account from "$lib/client/stores/account.store";
  import { onMount } from "svelte";

  export let date: Date;
  let data: ISessionLog[] = [];
  let previousTimePeriodData: ISessionLog[] = [];
  let isRefreshing = false;
  let dev_isUseCloud = false;

  $: totalFocus = data.reduce((acc, curr) => acc + (curr.focus ?? 0), 0);
  $: totalBreak = data.reduce((acc, curr) => acc + (curr.breakTime ?? 0), 0);
  $: total = totalFocus + totalBreak;
  $: previousFocus = previousTimePeriodData.reduce(
    (acc, curr) => acc + (curr.focus ?? 0),
    0
  );
  $: previousBreak = previousTimePeriodData.reduce(
    (acc, curr) => acc + (curr.breakTime ?? 0),
    0
  );
  $: previousTotal = previousFocus + previousBreak;

  onMount(() => {
    refresh();
  });

  async function refresh() {
    isRefreshing = true;
    const isUseCloud = dev_isUseCloud && account.isCloudUserAndOnline();
    [data, previousTimePeriodData] = await Promise.all([
      sessionLogStore.selectMany(
        {
          filters: {
            start: date
          }
        },
        {
          isUseCloud
        }
      ),
      sessionLogStore.selectMany(
        {
          filters: {
            start: new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate() - 1
            )
          }
        },
        {
          isUseCloud
        }
      )
    ]);
    isRefreshing = false;
  }
</script>

{#if isRefreshing}
  <OverviewCardsPulse />
{:else}
  <div
    class="w-full h-full flex flex-wrap justify-start items-start content-start dp:gap-4 gap-3"
  >
    <MetricItem type="total" value={total} previousValue={previousTotal} />
    <MetricItem type="focus" value={totalFocus} previousValue={previousFocus} />
    <MetricItem type="break" value={totalBreak} previousValue={previousBreak} />
  </div>
{/if}
