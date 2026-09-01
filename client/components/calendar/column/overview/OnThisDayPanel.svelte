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

  let {
    date,
    isRefreshing = $bindable(false)
  }: {
    date: Date;
    isRefreshing?: boolean;
  } = $props();

  let lastMonthData = $state<ISessionLog[]>([]);
  let lastYearData = $state<ISessionLog[]>([]);
  let twoYearsAgoData = $state<ISessionLog[]>([]);
  let dev_isUseCloud = false;
  const hasData = $derived(
    lastMonthData.length > 0 ||
      lastYearData.length > 0 ||
      twoYearsAgoData.length > 0
  );

  let lastMonthDate = $state<Date | null>(null);
  let lastYearDate = $state<Date | null>(null);
  let twoYearsAgoDate = $state<Date | null>(null);

  const lastMonthFocusHours = $derived(
    lastMonthData.reduce((acc, curr) => acc + (curr.focus ?? 0), 0)
  );
  const lastYearFocusHours = $derived(
    lastYearData.reduce((acc, curr) => acc + (curr.focus ?? 0), 0)
  );
  const twoYearsAgoFocusHours = $derived(
    twoYearsAgoData.reduce((acc, curr) => acc + (curr.focus ?? 0), 0)
  );

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
              startUnix: resolveLegacyDayFilter(lastMonthDate)
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
              startUnix: resolveLegacyDayFilter(lastYearDate)
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
              startUnix: resolveLegacyDayFilter(twoYearsAgoDate)
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

  function resolveLegacyDayFilter(date: Date) {
    const range = tzStore.resolveTimePeriodFilterForDay(date);
    return {
      greaterThanOrEqual: range.$gte,
      lessThanOrEqual: range.$lte
    };
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
