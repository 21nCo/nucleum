<script lang="ts">
  import Text from "@21n/elements/text/Text.svelte";
  import AnalyticsChartStandalone from "@21n/products/pointron/analytics/page/AnalyticsChartStandalone.svelte";
  import { sessionLogStore } from "@21n/products/pointron/logs/log.store";
  import type { ISessionLog } from "@21n/products/pointron/logs/log.type";
  import account from "@21n/stores/account.store";
  import { TextStyle } from "@21n/types/text.enum";
  import { TimeScale } from "@21n/types/time.type";
  import OnThisDayPanel from "@21n/components/calendar/column/overview/OnThisDayPanel.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import FocusMetricCards from "@21n/components/calendar/column/overview/FocusMetricCards.svelte";

  export let date: Date;
  export let scale: TimeScale = TimeScale.DAYS;
  export let isRewind: boolean = false;
  let data: ISessionLog[] = [];
  let previousTimePeriodData: ISessionLog[] = [];
  let isRefreshing = false;
  let dev_isUseCloud = false;

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

{#await refresh()}
  <EmptyStatusView
    isLoadingState={true}
    loadingAnimation={LoadingAnimationType.OVERVIEW_CARDS_PULSE}
  />
{:then}
  <div class="flex flex-col gap-4 h-full w-full">
    <div class="flex flex-col gap-4">
      <FocusMetricCards {data} {previousTimePeriodData} />
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
{:catch}
  <EmptyStatusView mainText="Something went wrong." />
{/await}

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.sessionLog])}
  on:change={() => {
    refresh();
  }}
/>
