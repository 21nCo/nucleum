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
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import {
    determineTimePeriodv2,
    determinePreviousTimePeriod
  } from "$lib/client/utils/time.utils";
  import { writable } from "svelte/store";
  import {
    AnalyticsCardType,
    type AnalyticsDataRecord,
    type IAnalyticsLabelColor
  } from "../analytics.types";
  import { sessionLogStore } from "../../logs/log.store";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { removeDuplicatesFilter } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import type { ISessionLogThumb } from "../../logs/log.type";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";

  export let id: string;
  let refreshId = new Date().getTime();
  let config = $analyticsConfigStore.pages.find((x) => x.id === id);

  const pageData = writable<{
    cards: AnalyticsDataRecord[][];
    colors: IAnalyticsLabelColor[];
    previous: AnalyticsDataRecord[][];
    isRefreshing: boolean;
  }>({
    cards: [],
    colors: [],
    previous: [],
    isRefreshing: false
  });

  if (config) {
    resolveData();
  }

  async function resolveData() {
    pageData.update((data) => ({ ...data, isRefreshing: true }));

    try {
      if (!config) {
        pageData.update((data) => ({ ...data, isRefreshing: false }));
        return;
      }

      const cardsData: AnalyticsDataRecord[][] = [];
      const previousData: AnalyticsDataRecord[][] = [];
      const colors: IAnalyticsLabelColor[] = [];
      let goalIds: IRecordId[] = [];
      await Promise.all(
        config.cards.map(async (card, index) => {
          const timePeriod = determineTimePeriodv2(card.period);
          const filters = {
            start: {
              type: "date",
              greaterThanOrEqual: timePeriod.begin,
              lessThanOrEqual: timePeriod.end
            }
          };

          // Fetch session logs for this time period

          const logs = await sessionLogStore.selectMany({
            filters,
            orderBy: { start: "asc" }
          });
          console.log({ logs });
          const processedLogs: AnalyticsDataRecord[] = logs.map(
            (log: ISessionLogThumb) => ({
              brek: log.breakTime || 0,
              focus: log.focus || 0,
              goal: log.goal ? log.goal.label || "Unknown Goal" : "No Goal",
              goalId: log.goalId || "",
              start: log.start,
              topLevelGoal:
                log.topLevelGoal?.[0]?.label ?? log.goal?.label ?? "Unknown"
            })
          );

          cardsData[index] = processedLogs;
          goalIds.push(...processedLogs.map((x: any) => x.goalId));
          goalIds.push(
            ...processedLogs.map((x: any) => x.topLevelGoal?.[0]?.id)
          );

          if (
            card.type === AnalyticsCardType.TOP_N ||
            card.type === AnalyticsCardType.METRICS
          ) {
            const previousPeriod = determinePreviousTimePeriod(card.period);
            if (previousPeriod) {
              const previousFilters = {
                start: {
                  type: "date",
                  greaterThanOrEqual: previousPeriod,
                  lessThanOrEqual: timePeriod.begin
                }
              };

              const previousLogs = await sessionLogStore.selectMany({
                filters: previousFilters,
                orderBy: { start: "asc" }
              });

              const processedPreviousLogs = previousLogs.map(
                (log: ISessionLogThumb) => ({
                  brek: log.breakTime || 0,
                  focus: log.focus || 0,
                  goal: log.goal ? log.goal.label || "Unknown Goal" : "No Goal",
                  goalId: log.goalId || "",
                  start: log.start,
                  topLevelGoal: log.goalId
                    ? log.goalLabel || "Unknown Goal"
                    : "No Goal"
                })
              );

              previousData[index] = processedPreviousLogs;
              goalIds.push(...processedPreviousLogs.map((x: any) => x.goalId));
            }
          }
        })
      );

      if (isValidArrayWithData(goalIds)) {
        const goals = await goalStore.selectMany(
          {
            filters: {
              id: goalIds.filter(removeDuplicatesFilter)
            }
          },
          { isIncludeSubItems: true }
        );
        goals.forEach((goal: IGoalThumb) => {
          let color = resolveGoalColor(goal);
          color = color ?? Math.floor(Math.random() * 360);
          if (!colors.some((x) => x.label === goal.label)) {
            colors.push({
              label: goal.label,
              color: color
            });
          }
        });
      }

      pageData.set({
        cards: cardsData,
        colors: colors,
        previous: previousData,
        isRefreshing: false
      });
      console.log({ cardsData, previousData, colors });
      refreshId = new Date().getTime();
    } catch (error) {
      console.error("Error resolving analytics data:", error);
      pageData.update((data) => ({ ...data, isRefreshing: false }));
    }
  }

  async function onCardConfigChange() {
    await resolveData();
  }

  async function addCard() {
    analyticsConfigStore.addCard(id);
    await resolveData();
  }
</script>

{#if config && ((isValidArrayWithData($pageData?.cards) && !$pageData.isRefreshing) || $isInEditMode)}
  {#key `${refreshId}-${$isInEditMode}`}
    <div
      class={cn("flex h-full max-h-full p-2", {
        "flex-col gap-3 overflow-auto": $view.isPortrait,
        "flex-wrap gap-2": !$view.isPortrait
      })}
    >
      {#each config.cards as card, index}
        {#if $pageData.cards?.[index]}
          <AnalyticsCardView
            {card}
            data={$pageData.cards?.[index]}
            previousTimePeriodData={$pageData.previous?.[index]}
            goalColors={$pageData.colors}
            position={{ index, total: config.cards.length }}
            pageId={id}
            on:change={onCardConfigChange}
          />
        {/if}
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
  {/key}
{:else}
  <EmptyStatusView
    isLoadingState={$pageData?.isRefreshing}
    mainText={$pageData?.cards === undefined || !config
      ? "Geez Something went wrong!"
      : "Shoot! No cards configured."}
    subText={$pageData?.cards === undefined || !config
      ? "Please try again after sometime or chat with us"
      : "Please click on edit and add cards to display them here."}
  />
{/if}
