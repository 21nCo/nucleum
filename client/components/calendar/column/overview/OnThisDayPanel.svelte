<script lang="ts">
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { sessionLogStore } from "@21n/products/pointron/logs/log.store";
  import type { ISessionLog } from "@21n/products/pointron/logs/log.type";
  import account from "@21n/stores/account.store";
  import { Size } from "@21n/types/size.enum";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { onMount } from "svelte";
  import HistoricalMetrics from "@21n/components/calendar/column/overview/HistoricalMetrics.svelte";

  export let date: Date;
  export let isRefreshing = false;

  let lastMonthData: ISessionLog[] = [];
  let lastYearData: ISessionLog[] = [];
  let twoYearsAgoData: ISessionLog[] = [];
  let dev_isUseCloud = false;
  let hasData = false;

  let lastMonthDate: Date | null = null;
  let lastYearDate: Date | null = null;
  let twoYearsAgoDate: Date | null = null;

  $: lastMonthFocusHours = lastMonthData.reduce(
    (acc, curr) => acc + (curr.focus ?? 0),
    0
  );
  $: lastYearFocusHours = lastYearData.reduce(
    (acc, curr) => acc + (curr.focus ?? 0),
    0
  );
  $: twoYearsAgoFocusHours = twoYearsAgoData.reduce(
    (acc, curr) => acc + (curr.focus ?? 0),
    0
  );

  $: hasData =
    lastMonthData.length > 0 ||
    lastYearData.length > 0 ||
    twoYearsAgoData.length > 0;

  onMount(() => {
    refresh();
  });

  function isValidDate(year: number, month: number, day: number): boolean {
    const date = new Date(year, month, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    );
  }

  function getLastWeekDate(currentDate: Date): Date | null {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate() - 7;

    if (isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
    return null;
  }

  function getLastMonthDate(currentDate: Date): Date | null {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() - 1;
    const day = currentDate.getDate();

    if (isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
    return null;
  }

  function getLastYearDate(currentDate: Date): Date | null {
    const year = currentDate.getFullYear() - 1;
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    if (isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
    return null;
  }

  function getTwoYearsAgoDate(currentDate: Date): Date | null {
    const year = currentDate.getFullYear() - 2;
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    if (isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
    return null;
  }

  async function refresh() {
    isRefreshing = true;
    const isUseCloud = dev_isUseCloud && account.isCloudUserAndOnline();

    lastMonthDate = getLastMonthDate(date);
    lastYearDate = getLastYearDate(date);
    twoYearsAgoDate = getTwoYearsAgoDate(date);

    // Array to store our promises
    const promises = [];
    const results = [];

    // Only fetch last month data if we have a valid date
    if (lastMonthDate) {
      promises.push(
        sessionLogStore.selectMany(
          {
            filters: {
              startUnix: tzStore.resolveTimePeriodFilterForDay(lastMonthDate)
            }
          },
          {
            isUseCloud
          }
        )
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Only fetch last year data if we have a valid date
    if (lastYearDate) {
      promises.push(
        sessionLogStore.selectMany(
          {
            filters: {
              startUnix: tzStore.resolveTimePeriodFilterForDay(lastYearDate)
            }
          },
          {
            isUseCloud
          }
        )
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Only fetch two years ago data if we have a valid date
    if (twoYearsAgoDate) {
      promises.push(
        sessionLogStore.selectMany(
          {
            filters: {
              startUnix: tzStore.resolveTimePeriodFilterForDay(twoYearsAgoDate)
            }
          },
          {
            isUseCloud
          }
        )
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Execute all promises
    results.push(...(await Promise.all(promises)));
    // Assign results to reactive variables
    [lastMonthData, lastYearData, twoYearsAgoData] = results;

    isRefreshing = false;
  }
</script>

<div class="flex flex-wrap gap-4 w-full">
  {#if isRefreshing}
    <EmptyStatusView
      isLoadingState={true}
      loadingAnimation={LoadingAnimationType.ON_THIS_DAY_PULSE}
      loadingText="Loading historical data"
    />
  {:else if !hasData}
    <EmptyStatusView
      mainText="No historical data found"
      subText="You don't have any focus sessions recorded for this day in previous periods"
      size={Size.sm}
    />
  {:else}
    {#if lastMonthData.length > 0 && lastMonthDate}
      <HistoricalMetrics
        title="1 Month ago"
        date={lastMonthDate}
        totalFocus={lastMonthFocusHours}
      />
    {/if}

    {#if lastYearData.length > 0 && lastYearDate}
      <HistoricalMetrics
        title="1 Year ago"
        date={lastYearDate}
        totalFocus={lastYearFocusHours}
      />
    {/if}

    {#if twoYearsAgoData.length > 0 && twoYearsAgoDate}
      <HistoricalMetrics
        title="2 Years ago"
        date={twoYearsAgoDate}
        totalFocus={twoYearsAgoFocusHours}
      />
    {/if}
  {/if}
</div>
