<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import AnalyticsChartStandalone from "$lib/client/products/pointron/analytics/page/AnalyticsChartStandalone.svelte";
  import { sessionLogStore } from "$lib/client/products/pointron/logs/log.store";
  import type { ISessionLog } from "$lib/client/products/pointron/logs/log.type";
  import account from "$lib/client/stores/account.store";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TimeScale } from "$lib/client/types/time.type";
  import OnThisDayPanel from "./OnThisDayPanel.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import FocusMetricCards from "./FocusMetricCards.svelte";

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
