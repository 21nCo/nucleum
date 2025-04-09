<script lang="ts">
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { analyticsConfigStore } from "../analytics.store";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import AnalyticsCardView from "./AnalyticsCardView.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { onMount } from "svelte";
  import { AnalyticsCardType, type AnalyticsPage } from "../analytics.types";
  import type { ITimePeriodResolved } from "$lib/client/types/time.type";
  import {
    determinePreviousTimePeriod,
    determineTimePeriodv2
  } from "$lib/client/utils/time.utils";
  import type { ISessionLog } from "../../logs/log.type";
  import { sessionLogStore } from "../../logs/log.store";
  import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  export let id: string;
  let goals: IGoalThumb[] = [];
  let logs: ISessionLog[] = [];
  let isLoading = true;
  let config: AnalyticsPage | undefined;
  let cardsTimePeriods: { [key: string]: ITimePeriodResolved } = {};
  let timeRangeForPage: { begin: number; end: number } | undefined;

  async function addCard() {
    analyticsConfigStore.addCard(id);
    refreshConfig();
  }

  onMount(() => {
    refreshConfig();
    refreshData();
  });

  /**
   * Refresh data for the page
   * 24 hours buffer is added to the time range for the page to accommodate for the timezone offset
   */
  async function refreshData() {
    isLoading = true;
    console.time("refreshData");
    goals = await goalStore.selectMany(
      {},
      { isIncludeSubItems: true, isExpand: true }
    );
    if (!timeRangeForPage) return;
    logs = await sessionLogStore.selectMany({
      properties: ["id", "startUnix", "goalId", "focus", "breakTime"],
      filters: {
        startUnix: {
          greaterThanOrEqual: timeRangeForPage.begin - 24 * 60 * 60,
          lessThanOrEqual: timeRangeForPage.end + 24 * 60 * 60
        }
      },
      orderBy: {
        startUnix: "desc"
      }
    });
    // console.log({ goals, logs });
    console.timeEnd("refreshData");
    isLoading = false;
  }

  function refreshConfig() {
    try {
      config = $analyticsConfigStore.pages.find((x) => x.id === id);
      if (!config) return;
      cardsTimePeriods = config.cards.reduce(
        (acc, card) => {
          const timePeriod = determineTimePeriodv2(card.period);
          acc[card.id] = {
            begin: resolveUnixTimestamp(timePeriod.begin),
            end: resolveUnixTimestamp(timePeriod.end),
            title: timePeriod.title
          };
          return acc;
        },
        {} as { [key: string]: ITimePeriodResolved }
      );
      let previousPeriods: { [key: string]: number } = {};
      if (
        config.cards.some(
          (x) =>
            x.type === AnalyticsCardType.TOP_N ||
            x.type === AnalyticsCardType.METRICS
        )
      ) {
        const cardsWithPreviousPeriods = config.cards.filter(
          (x) =>
            x.type === AnalyticsCardType.TOP_N ||
            x.type === AnalyticsCardType.METRICS
        );
        cardsWithPreviousPeriods.forEach((card) => {
          const timePeriod = determinePreviousTimePeriod(card.period);
          previousPeriods[card.id] = resolveUnixTimestamp(timePeriod);
        });
      }
      timeRangeForPage = {
        begin: Math.min(
          ...Object.values(cardsTimePeriods).map((x) => x.begin),
          ...Object.values(previousPeriods).map((x) => x)
        ),
        end: Math.max(...Object.values(cardsTimePeriods).map((x) => x.end))
      };
    } catch (error) {
      logger.error({
        at: "AnalyticsPageView.svelte - refreshConfig",
        error
      });
    }
  }

  function onReload() {
    refreshConfig();
    refreshData();
  }
</script>

{#if config}
  <div
    class={cn("flex h-full max-h-full p-2", {
      "flex-col gap-3 overflow-auto": $view.isPortrait,
      "flex-wrap gap-2": !$view.isPortrait
    })}
  >
    {#each config.cards as card, index (card.id)}
      <AnalyticsCardView
        {card}
        {goals}
        {logs}
        isPageLoaded={!isLoading}
        timePeriod={cardsTimePeriods[card.id]}
        position={{ index, total: config.cards.length }}
        pageId={id}
        on:reload={onReload}
        on:removed={() => refreshConfig()}
      />
    {/each}
    {#if $isInEditMode && config.cards.length < 10}
      <div>
        <button
          class={cn(
            "border-2 border-dotted border-brs3 hover:bg-bgs2 rounded-md grow flex flex-col gap-1 justify-center items-center",
            {
              "w-full": $view.isPortrait,
              "w-60": !$view.isPortrait
            }
          )}
          style="height: calc(50vh - 2.85rem)"
          on:click={addCard}
        >
          <Icon icon="plus-circled" />
          <Button label="Add card" style={ButtonStyle.PLAIN} />
        </button>
      </div>
    {/if}
    {#if $view.isPortrait}
      <ScrollViewBottomSpacer />
    {/if}
  </div>
{:else}
  <EmptyStatusView
    isLoadingState={isLoading}
    mainText={!config
      ? "Geez Something went wrong!"
      : "Shoot! No cards configured."}
    subText={!config
      ? "Please try again after sometime or chat with us"
      : "Please click on edit and add cards to display them here."}
  />
{/if}
