<script lang="ts">
  import AnalyticsChartStandalone from "@21n/products/pointron/analytics/page/AnalyticsChartStandalone.svelte";
  import { sessionLogStore } from "@21n/products/pointron/logs/log.store";
  import type { ISessionLog } from "@21n/products/pointron/logs/log.type";
  import account from "@21n/stores/account.store";
  import { TimeScale } from "@21n/types/time.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import FocusMetricCards from "@21n/components/calendar/column/overview/FocusMetricCards.svelte";

  export let date: Date;
  export let scale: TimeScale = TimeScale.DAYS;
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
      <AnalyticsChartStandalone {date} {scale} showLegend={false} />
    </div>
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
