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
  import { onMount } from "svelte";

  let {
    date,
    scale = TimeScale.DAYS
  }: {
    date: Date;
    scale?: TimeScale;
  } = $props();

  let data = $state<ISessionLog[]>([]);
  let previousTimePeriodData = $state<ISessionLog[]>([]);
  let isRefreshing = $state(false);
  let errorMessage = $state("");
  let dev_isUseCloud = false;

  async function refresh() {
    isRefreshing = true;
    errorMessage = "";
    const resolvedDate = date instanceof Date ? date : new Date(date);
    const isUseCloud = dev_isUseCloud && account.isCloudUserAndOnline();
    const currentDayFilter = tzStore.resolveTimePeriodFilterForDay(resolvedDate);
    const previousDayFilter = tzStore.resolveTimePeriodFilterForDay(
      new Date(
        resolvedDate.getFullYear(),
        resolvedDate.getMonth(),
        resolvedDate.getDate() - 1
      )
    );
    try {
      [data, previousTimePeriodData] = await Promise.all([
        sessionLogStore.selectMany(
          {
            filters: {
              startUnix: currentDayFilter
            }
          },
          {
            isUseCloud
          }
        ),
        sessionLogStore.selectMany(
          {
            filters: {
              startUnix: previousDayFilter
            }
          },
          {
            isUseCloud
          }
        )
      ]);
      isRefreshing = false;
    } catch (error) {
      isRefreshing = false;
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  onMount(() => {
    refresh();
  });
</script>

{#if isRefreshing}
  <EmptyStatusView
    isLoadingState={true}
    loadingAnimation={LoadingAnimationType.OVERVIEW_CARDS_PULSE}
  />
{:else if errorMessage}
  <EmptyStatusView mainText="Something went wrong." />
{:else}
  <div class="flex flex-col gap-4 h-full w-full">
    <div class="flex flex-col gap-4">
      <FocusMetricCards {data} {previousTimePeriodData} />
      <AnalyticsChartStandalone {date} {scale} showLegend={false} />
    </div>
  </div>
{/if}

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.sessionLog])}
  onChange={() => {
    refresh();
  }}
/>
