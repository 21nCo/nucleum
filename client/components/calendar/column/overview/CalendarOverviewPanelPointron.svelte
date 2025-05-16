<script lang="ts">
  import OverviewCardsPulse from "$lib/client/elements/feedback/animations/DashboardPulse/OverviewCardsPulse.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import MetricItem from "$lib/client/products/pointron/analytics/cards/metrics/MetricItem.svelte";
  import AnalyticsChartStandalone from "$lib/client/products/pointron/analytics/page/AnalyticsChartStandalone.svelte";
  import { sessionLogStore } from "$lib/client/products/pointron/logs/log.store";
  import type { ISessionLog } from "$lib/client/products/pointron/logs/log.type";
  import account from "$lib/client/stores/account.store";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TimeScale } from "$lib/client/types/time.type";
  import { onMount } from "svelte";
  import OnThisDayPanel from "./OnThisDayPanel.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";

  export let date: Date;
  export let scale: TimeScale = TimeScale.DAYS;
  export let isRewind: boolean = false;
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
            startUnix: tzStore.resolveTimePeriodFilterForDay(date)
          }
        },
        {
          isUseCloud
        }
      ),
      sessionLogStore.selectMany(
        {
          filters: {
            startUnix: tzStore.resolveTimePeriodFilterForDay(
              new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
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
  <div class="flex flex-col gap-4 h-full w-full">
    <div class="flex flex-col gap-4">
      <div
        class="w-full flex flex-wrap justify-start items-start content-start dp:gap-4 gap-3"
      >
        <MetricItem type="total" value={total} previousValue={previousTotal} />
        <MetricItem
          type="focus"
          value={totalFocus}
          previousValue={previousFocus}
        />
        <MetricItem
          type="break"
          value={totalBreak}
          previousValue={previousBreak}
        />
      </div>
      <AnalyticsChartStandalone {date} {scale} />
    </div>
    {#if !isRewind}
      <div class="flex flex-col gap-4">
        <Text content="On this day" style={TextStyle.SECTION_HEADING} />
        <OnThisDayPanel {date} {isRefreshing} />
      </div>
    {/if}
    <ScrollViewBottomSpacer />
  </div>
{/if}
