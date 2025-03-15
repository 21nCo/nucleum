<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TimePeriodPicker from "$lib/client/elements/datetime/timeperiodpicker/TimePeriodPicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import {
    determinePreviousTimePeriod,
    determineTimePeriodv2,
    timePeriodLabel
  } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    AnalyticsCardType,
    type AnalyticsCard,
    type AnalyticsDataRecord,
    type IAnalyticsLabelColor
  } from "../analytics.types";
  import { analyticsConfigStore } from "../analytics.store";
  import { createEventDispatcher, onMount } from "svelte";
  import CardSelector from "./CardSelector.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import GroupingAndFilters from "./GroupingAndFilters.svelte";
  import CardResolver from "./CardResolver.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { sessionLogStore } from "../../logs/log.store";
  import type { ISessionLogThumb } from "../../logs/log.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import { removeDuplicatesFilter } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import account from "$lib/client/stores/account.store";
  export let card: AnalyticsCard;
  export let position: { index: number; total: number };
  export let pageId: string;
  let data: AnalyticsDataRecord[];
  let previousTimePeriodData: AnalyticsDataRecord[] = [];
  let goalColors: IAnalyticsLabelColor[] = [];
  let parentBgIndex = $view.isPortrait ? 1 : 2;
  const dispatch = createEventDispatcher();
  let isRefreshing = false;

  $: timePeriod = timePeriodLabel(card.period);
  $: isCarbonChart =
    card.type === AnalyticsCardType.PIE ||
    card.type === AnalyticsCardType.DONUT ||
    card.type === AnalyticsCardType.AREA ||
    card.type === AnalyticsCardType.LINE;

  onMount(() => {
    refresh();
  });

  function onRemoveClick() {
    analyticsConfigStore.removeCard(pageId, card.id);
    dispatch("change", card);
    refresh();
  }

  function onTimePeriodChange(e: CustomEvent) {
    console.log({ e, period: card.period });
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card,
      period: e.detail
    });
    dispatch("change", card);
    refresh();
  }

  function onCardTypeChange(e: CustomEvent) {
    console.log({ e, type: card.type });
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card,
      type: e.detail
    });
    dispatch("change", card);
    refresh();
  }

  function onGroupingAndFilterChange(e: CustomEvent) {
    console.log({ e, grouping: card.grouping });
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card
    });
    dispatch("change", card);
    refresh();
  }

  function onCardLabelChange() {
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card
    });
  }

  async function refresh() {
    isRefreshing = true;

    try {
      const colors: IAnalyticsLabelColor[] = [];
      let goalIds: IRecordId[] = [];
      const timePeriod = determineTimePeriodv2(card.period);
      const filters = {
        start: {
          type: "date",
          greaterThanOrEqual: timePeriod.begin,
          lessThanOrEqual: timePeriod.end
        }
      };

      // Fetch session logs for this time period
      console.time(`logs query - ${card.id}`);
      const logs = await sessionLogStore.selectMany(
        {
          filters
        },
        {
          isUseCloud: account.isCloudUserAndOnline()
        }
      );
      console.timeEnd(`logs query - ${card.id}`);
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

      data = processedLogs;
      goalIds.push(...processedLogs.map((x: any) => x.goalId));
      goalIds.push(...processedLogs.map((x: any) => x.topLevelGoal?.[0]?.id));

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

          previousTimePeriodData = processedPreviousLogs;
          goalIds.push(...processedPreviousLogs.map((x: any) => x.goalId));
        }
      }

      // if (isValidArrayWithData(goalIds)) {
      //   const goals = await goalStore.selectMany(
      //     {
      //       filters: {
      //         id: goalIds.filter(removeDuplicatesFilter)
      //       }
      //     },
      //     { isIncludeSubItems: true }
      //   );
      //   goals.forEach((goal: IGoalThumb) => {
      //     let color = resolveGoalColor(goal);
      //     color = color ?? Math.floor(Math.random() * 360);
      //     if (!colors.some((x) => x.label === goal.label)) {
      //       colors.push({
      //         label: goal.label,
      //         color: color
      //       });
      //     }
      //   });
      // }
      // goalColors = colors;
      isRefreshing = false;
    } catch (error) {
      console.error("Error resolving analytics data:", error);
      isRefreshing = false;
    }
  }
</script>

<div
  class={cn("flex flex-col grow border border-brs2 rounded-md mo:bg-bgs1", {
    "w-full h-96 p-2": $view.isPortrait,
    "h-[32rem]": $view.isPortrait && $isInEditMode,
    "min-w-1/2 w-1/2 2k:min-w-min 2k:w-3/10 p-4 bg-bgs2": !$view.isPortrait,
    "w-4/5": position.total === 1 && !$view.isPortrait,
    "w-1/3":
      !$view.isPortrait &&
      (card.type === AnalyticsCardType.PIE ||
        card.type === AnalyticsCardType.DONUT ||
        card.type === AnalyticsCardType.TOP_N ||
        card.type === AnalyticsCardType.METRICS),
    "border border-brs2": $isInEditMode
  })}
  style={!$view.isPortrait
    ? position.total === 1
      ? "height: calc(100vh - 8rem);"
      : $isInEditMode
        ? "height: calc(60vh - 2.85rem);"
        : "height: calc(50vh - 2.85rem);"
    : ""}
>
  {#if isRefreshing || !data || data.length === 0}
    <div class="animate-pulse flex flex-col gap-3">
      <div class="h-8 w-full bg-bgs3 bg-opacity-50 rounded-md"></div>
      <div class="h-4 w-1/2 bg-bgs3 bg-opacity-50 rounded-md"></div>
    </div>
  {:else}
    <header
      class={cn("w-full", {
        "h-6": !$isInEditMode,
        "h-32": $isInEditMode
      })}
    >
      {#if $isInEditMode}
        <div
          class={cn(
            "w-full flex flex-col gap-3 border border-dashed border-brs3 rounded-md p-2 dp:p-3",
            {}
          )}
        >
          <span class="flex justify-between w-full">
            <TextInput
              bind:value={card.label}
              placeholder="chart title"
              style={InputStyle.PLAIN}
              on:debouncedChange={onCardLabelChange}
            />
            <span class="flex gap-2 items-center">
              <GroupingAndFilters
                {card}
                on:select={onGroupingAndFilterChange}
                {parentBgIndex}
              />
              <Button
                icon="cross-circled"
                tooltip={$view.isPortrait ? "Remove" : ""}
                label={$view.isPortrait ? "" : "Remove"}
                {parentBgIndex}
                isPreventMinWidth={true}
                type={ButtonVariant.DANGER}
                style={$view.isPortrait
                  ? ButtonStyle.DEFAULT
                  : ButtonStyle.OUTLINED}
                size={$view.isPortrait ? Size.lg : Size.xs}
                on:click={onRemoveClick}
              />
            </span>
          </span>
          <span class="flex w-full gap-2">
            {#if card.type != AnalyticsCardType.TARGETS}
              <span class="w-1/2">
                <TimePeriodPicker
                  bind:period={card.period}
                  on:change={onTimePeriodChange}
                />
              </span>
            {/if}
            <span class="w-1/2">
              <CardSelector
                bind:selected={card.type}
                on:select={onCardTypeChange}
              />
            </span>
          </span>
        </div>
      {:else}
        <div class="flex w-full justify-between items-center">
          <span class="font-medium">
            {card.type === AnalyticsCardType.TARGETS
              ? "Targets"
              : card.label ?? timePeriod}
          </span>
          {#if card.type != AnalyticsCardType.TARGETS && card.label}
            <span class="text-fgs2 text-b2">
              {timePeriod}
            </span>
          {/if}
        </div>
      {/if}
    </header>
    <div
      class={cn("flex w-full items-center justify-center", {
        "h-[24rem]": $view.isPortrait && $isInEditMode,
        "h-[22.5rem]": $view.isPortrait && !$isInEditMode
      })}
      style={!$view.isPortrait && !$isInEditMode
        ? "height: calc(100% - 2rem)"
        : !$view.isPortrait
          ? "height: calc(100% - 6rem)"
          : ""}
    >
      {#if $isInEditMode}
        <div
          class={cn("w-full", {
            "h-full": !$view.isPortrait || ($view.isPortrait && !isCarbonChart),
            "h-4/5": $view.isPortrait && isCarbonChart
          })}
        >
          <CardResolver
            {card}
            {data}
            {goalColors}
            {previousTimePeriodData}
            {parentBgIndex}
          />
        </div>
      {:else}
        <CardResolver
          {card}
          {data}
          {goalColors}
          {previousTimePeriodData}
          {parentBgIndex}
        />
      {/if}
    </div>
  {/if}
</div>
