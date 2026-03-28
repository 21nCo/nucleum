<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import TimePeriodPicker from "@21n/elements/datetime/timeperiodpicker/TimePeriodPicker.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { isInEditMode } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import { Size } from "@21n/types/size.enum";
  import { determinePreviousTimePeriod } from "@21n/utils/time.utils";
  import { cn } from "@21n/utils/ui.utils";
  import {
    AnalyticsCardType,
    type IAnalyticsCard,
    type AnalyticsDataRecord,
    type IAnalyticsLabelColor
  } from "@21n/products/pointron/analytics/analytics.types";
  import { analyticsConfigStore } from "@21n/products/pointron/analytics/analytics.store";
  import { createEventDispatcher } from "svelte";
  import CardSelector from "@21n/products/pointron/analytics/page/CardSelector.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import GroupingAndFilters from "@21n/products/pointron/analytics/page/GroupingAndFilters.svelte";
  import CardResolver from "@21n/products/pointron/analytics/page/CardResolver.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import type { IRecordId } from "@21n/types/data.type";
  import type { ISessionLog } from "@21n/products/pointron/logs/log.type";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  import type { IGoal, IGoalThumb } from "@21n/components/goals/goal.type";
  import { resolveGoalColor } from "@21n/components/goals/goal.utils";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";
  import type { ITimePeriodResolved } from "@21n/types/time.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { logger } from "@21n/components/debug/logger.client";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { ErrorMessage } from "@21n/components/error/error.type";
  export let card: IAnalyticsCard;
  export let position: { index: number; total: number };
  export let pageId: string;
  export let goals: IGoalThumb[] = [];
  export let logs: ISessionLog[] = [];
  export let timePeriod: ITimePeriodResolved;
  export let isPageLoaded = false;
  export let parentBgIndex: number = 1;
  export let heightAdjuster: string = "2.85rem";
  let cardBgIndex: number = parentBgIndex - 1;
  let data: AnalyticsDataRecord[] = [];
  let previousTimePeriodData: AnalyticsDataRecord[] = [];
  let goalColors: IAnalyticsLabelColor[] = [];
  const dispatch = createEventDispatcher();
  let isRefreshing = false;
  let refreshId = new Date().getTime();
  let errorMessage: string | undefined = undefined;
  const isCarbonChart = false;
  const isCanRenderInSmallerArea = [
    AnalyticsCardType.PIE,
    AnalyticsCardType.DONUT,
    AnalyticsCardType.SUNBURST,
    AnalyticsCardType.TOP_N,
    AnalyticsCardType.METRICS
  ];

  $: if (isPageLoaded) {
    refresh();
  }
  function onRemoveClick() {
    analyticsConfigStore.removeCard(pageId, card.id);
    dispatch("removed", card);
  }

  function onTimePeriodChange(e: CustomEvent) {
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card,
      period: e.detail
    });
    dispatch("reload");
  }

  function onCardTypeChange(e: CustomEvent) {
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card,
      type: e.detail
    });
    refresh();
  }

  function onGroupByChange(e: CustomEvent) {
    card.isGroupByTopLevelGoals = e.detail;
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card
    });
    refresh();
  }

  function onCardLabelChange() {
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card
    });
  }

  function resolveGoalFromId(id: IRecordId | undefined) {
    if (!id) return;
    const goal = goals.find(resourceInList(id));
    return goal;
  }

  function resolveGoalThumb(goal: IGoal | IGoalThumb | undefined) {
    return goal as IGoalThumb | undefined;
  }

  async function refresh() {
    isRefreshing = true;
    data = [];
    previousTimePeriodData = [];
    errorMessage = undefined;
    try {
      const colors: IAnalyticsLabelColor[] = [];
      if (!card.period || !card.period.value) {
        errorMessage = "Invalid time period.";
        isRefreshing = false;
        return;
      }
      if (
        !timePeriod.begin ||
        !timePeriod.end ||
        timePeriod.begin.toString() === "Invalid Date" ||
        timePeriod.end.toString() === "Invalid Date"
      ) {
        errorMessage = "Please select a valid time period.";
        isRefreshing = false;
        return;
      }
      const correctedTimePeriod = tzStore.resolveTimePeriodCorrectedByTz(
        {
          begin: timePeriod.begin,
          end: timePeriod.end
        },
        { tzRecords: $tzStore }
      );
      const filteredLogs = logs.filter(
        (log) =>
          log.startUnix >= correctedTimePeriod.correctedBegin &&
          log.startUnix <= correctedTimePeriod.correctedEnd
      );
      const randomColor = () => Math.floor(Math.random() * 360);

      const dataMapper = (log: ISessionLog) => {
        const goal = log.goalId ? resolveGoalFromId(log.goalId) : undefined;
        const tzCorrectedStart = tzStore.resolveTimezoneCorrectedTimestamp(
          log.startUnix,
          {
            tzRecords: $tzStore
          }
        );
        if (goal && !colors.some((x) => x.label === goal.label)) {
          const color = resolveGoalColor(goal);
          colors.push({
            label: goal.label,
            color: color ?? randomColor()
          });
        }
        const topLevelGoal = goal?.parent?.[0];
        if (
          topLevelGoal &&
          !colors.some((x) => x.label === topLevelGoal.label)
        ) {
          const color = resolveGoalColor(resolveGoalThumb(topLevelGoal));
          colors.push({
            label: topLevelGoal.label,
            color: color ?? randomColor()
          });
        }
        const goalLabel = goal ? goal.label || "Unknown Goal" : "No Goal";
        return {
          brek: log.breakTime || 0,
          focus: log.focus || 0,
          goal: goalLabel,
          goalId: log.goalId || "",
          start: new Date(tzCorrectedStart).toISOString(),
          topLevelGoal: topLevelGoal?.label ?? goalLabel
        };
      };

      filteredLogs.forEach((log: ISessionLog) => {
        data.push(dataMapper(log));
      });

      if (
        card.type === AnalyticsCardType.TOP_N ||
        card.type === AnalyticsCardType.METRICS
      ) {
        const previousPeriod = determinePreviousTimePeriod(card.period);
        if (previousPeriod) {
          const correctedPreviousBegin =
            tzStore.resolveTimezoneCorrectedTimestamp(
              resolveUnixTimestamp(previousPeriod),
              {
                tzRecords: $tzStore
              }
            );
          const previousLogs = logs.filter(
            (log) =>
              log.startUnix >= correctedPreviousBegin &&
              log.startUnix <= correctedTimePeriod.begin
          );
          previousLogs.forEach((log: ISessionLog) => {
            previousTimePeriodData.push(dataMapper(log));
          });
        }
      }
      goalColors = [
        ...colors.filter((x) => x.color),
        {
          label: "No Goal",
          color: 250
        },
        {
          label: "Unknown Goal",
          color: 250
        }
      ];
      refreshId = new Date().getTime();
      isRefreshing = false;
    } catch (error) {
      logger.error(
        {
          at: "AnalyticsCardView.refresh"
        },
        error
      );
      errorMessage = ErrorMessage.DEFAULT;
      isRefreshing = false;
    }
  }
</script>

<div
  class={cn("flex flex-col grow border border-brs2 rounded-md bg-bgs1", {
    "w-full h-96 p-2": $view.isPortrait,
    "p-4": !$view.isPortrait,
    "h-[32rem]": $view.isPortrait && $isInEditMode,
    "w-4/5": position.total === 1 && !$view.isPortrait,
    "w-2/5 2k:w-3/10":
      !$view.isPortrait && isCanRenderInSmallerArea.includes(card.type),
    "w-3/5": !$view.isPortrait && !isCanRenderInSmallerArea.includes(card.type),
    "border border-brs2": $isInEditMode
  })}
  style={!$view.isPortrait
    ? position.total === 1
      ? "height: calc(100vh - 8rem);"
      : $view.height < 900
        ? `height: calc(70vh - ${heightAdjuster});`
        : $isInEditMode
          ? `height: calc(60vh - ${heightAdjuster});`
          : `height: calc(50vh - ${heightAdjuster});`
    : ""}
>
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
              {onGroupByChange}
              parentBgIndex={cardBgIndex}
            />
            <Button
              icon="cross-circled"
              tooltip={$view.isPortrait ? "Remove" : ""}
              label={$view.isPortrait ? "" : "Remove"}
              parentBgIndex={cardBgIndex}
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
              accessPoint={ResourceAccessPoint.ANALYTICS}
            />
          </span>
        </span>
      </div>
    {:else}
      <div class="flex w-full justify-between items-center">
        <span class="font-medium">
          {card.type === AnalyticsCardType.TARGETS
            ? "Targets"
            : (card.label ?? timePeriod.title)}
        </span>
        {#if card.type != AnalyticsCardType.TARGETS && card.label}
          <span class="text-fgs2 text-b2">
            {timePeriod.title}
          </span>
        {/if}
      </div>
    {/if}
  </header>
  {#if isRefreshing || !isPageLoaded}
    <div class="animate-pulse flex flex-col gap-3 py-1">
      <div class="h-8 w-full bg-bgs3 rounded-md"></div>
      <div class="h-4 w-1/2 bg-bgs3 rounded-md"></div>
    </div>
  {:else if errorMessage}
    <div class="flex w-full h-full justify-center items-center">
      <EmptyStatusView
        size={Size.sm}
        mainText={errorMessage}
        actionText="Remove card"
        parentBgIndex={cardBgIndex}
        on:click={onRemoveClick}
      />
    </div>
  {:else}
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
      {#key refreshId}
        {#if $isInEditMode}
          <div
            class={cn("w-full", {
              "h-full":
                !$view.isPortrait || ($view.isPortrait && !isCarbonChart),
              "h-4/5": $view.isPortrait && isCarbonChart
            })}
          >
            <CardResolver
              {card}
              {data}
              {goalColors}
              {previousTimePeriodData}
              parentBgIndex={cardBgIndex}
            />
          </div>
        {:else}
          <CardResolver
            {card}
            {data}
            {goalColors}
            {previousTimePeriodData}
            parentBgIndex={cardBgIndex}
          />
        {/if}
      {/key}
    </div>
  {/if}
</div>
