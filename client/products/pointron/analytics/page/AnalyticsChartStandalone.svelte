<script lang="ts">
  import AnalyticsChart from "./AnalyticsChart.svelte";
  import {
    type AnalyticsDataRecord,
    type IAnalyticsLabelColor,
    AnalyticsCardType
  } from "../analytics.types";
  import {
    TimePeriodType,
    TimeScale,
    type TimePeriodValue
  } from "$lib/client/types/time.type";
  import CardSelector from "./CardSelector.svelte";
  import { sessionLogStore } from "../../logs/log.store";
  import { resolveRelativeTimePeriodOptions } from "$lib/client/elements/datetime/datetime.utils";
  import { onMount } from "svelte";
  import type { ISessionLog } from "../../logs/log.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    removeDuplicatesFilter,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import {
    determineTimePeriodv2,
    resolveUpperRelativeTimePeriodTitle
  } from "$lib/client/utils/time.utils";
  import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "$lib/client/types/select.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { fly } from "svelte/transition";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import view from "$lib/client/stores/view.store";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CALENDAR;
  export let date: Date | undefined = undefined;
  export let scale: TimeScale | undefined = undefined;
  export let goalId: IRecordId | undefined = undefined;
  let periodValue: TimePeriodValue = {
    type: TimePeriodType.RELATIVE,
    param: 0
  };

  let resolvedTimePeriod:
    | {
        begin: Date;
        end: Date;
        title: string;
      }
    | undefined = undefined;
  let goals: IGoalThumb[] = [];
  let goalColors: IAnalyticsLabelColor[] = [];
  let data: AnalyticsDataRecord[] = [];
  let chartType = AnalyticsCardType.DONUT;
  let isRefreshing = false;
  let timePeriodOptions: ISelectItem[] = [];
  const scales = $userPreferences.timeScales ?? [
    TimeScale.DAYS,
    TimeScale.MONTHS,
    TimeScale.YEARS
  ];
  let isShowOptions = false;
  let isIncludeSubgoals = false;

  $: timePeriodOptions = resolveRelativeTimePeriodOptions(
    scale ?? TimeScale.DAYS
  );

  onMount(() => {
    refresh();
  });

  async function refresh() {
    isRefreshing = true;
    logger.log({
      at: "AnalyticsChartStandalone.svelte - refresh",
      periodValue
    });
    try {
      goals = await goalStore.selectMany(
        {},
        { isIncludeSubItems: true, isExpand: true }
      );
      let startFilter = {};
      if (date) {
        startFilter = tzStore.resolveTimePeriodFilterForDay(date);
      } else {
        const result = tzStore.resolveTimePeriodCorrectedByTz(
          {
            scale: scale ?? TimeScale.DAYS,
            value: periodValue
          },
          { tzRecords: $tzStore }
        );
        resolvedTimePeriod = result.resolvedTimePeriod;
        startFilter = {
          greaterThanOrEqual: result.correctedBegin,
          lessThanOrEqual: result.correctedEnd
        };
      }
      let goalIds: IRecordId[] = [];
      if (goalId) {
        goalIds.push(goalId);
        if (isIncludeSubgoals) {
          const subGoals = goals.filter((x) =>
            x.parent?.some(resourceInList(goalId))
          );
          if (subGoals) {
            goalIds.push(...subGoals.map((x) => x.id));
          }
        }
      }
      const logsResult = await sessionLogStore.selectMany({
        properties: {
          select: ["id", "startUnix", "goalId", "focus", "breakTime"]
        },
        filters: {
          startUnix: startFilter,
          goalId: goalIds.length > 0 ? goalIds : undefined
        }
      });
      if (!logsResult || logsResult.length === 0) {
        data = [];
        isRefreshing = false;
        return;
      }

      const processedLogs: AnalyticsDataRecord[] = logsResult.map(
        (log: ISessionLog) => {
          const goal = log.goalId ? resolveGoalFromId(log.goalId) : undefined;
          return {
            brek: log.breakTime || 0,
            focus: log.focus || 0,
            goal: goal ? goal.label || "Unknown Goal" : "No Goal",
            goalId: log.goalId || "",
            start: new Date(log.startUnix),
            topLevelGoal: goal?.parent?.[0]?.label ?? "Unknown"
          };
        }
      );
      data = processedLogs;
      goalColors = [];
      if (goalId && !isIncludeSubgoals) {
        const currentGoal = resolveGoalFromId(goalId);
        const color = resolveGoalColor(currentGoal);
        if (currentGoal && color) {
          goalColors.push({
            label: currentGoal.label,
            color: color
          });
        }
      } else if (!goalId) {
        const goalIdsInData = processedLogs.map((x) => x.goalId);
        goalIdsInData
          .filter(removeDuplicatesFilter)
          .forEach((goalId: IRecordId) => {
            const goal = resolveGoalFromId(goalId);
            if (!goal) return;
            let color = resolveGoalColor(goal);
            color = color ?? Math.floor(Math.random() * 360);
            if (!goalColors.some((x) => x.label === goal.label)) {
              goalColors.push({
                label: goal.label,
                color: color
              });
            }
          });
      }
      isRefreshing = false;
    } catch (error) {
      console.error(error);
    }
  }

  function resolveGoalFromId(id: IRecordId | undefined) {
    if (!id) return;
    const goal = goals.find(resourceInList(id));
    return goal;
  }
</script>

<div
  class={cn("flex flex-col w-full rounded-md border border-brs3 p-3", {
    "h-80": accessPoint === ResourceAccessPoint.CALENDAR,
    "h-full": accessPoint === ResourceAccessPoint.GOAL
  })}
>
  {#if accessPoint === ResourceAccessPoint.GOAL}
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4 w-full">
        {#if !$view.isConstrainedWidth}
          <Text content={"Focus analytics"} style={TextStyle.PANEL_HEADING} />
        {/if}
        {#if periodValue.type === TimePeriodType.UPPER_RELATIVE && resolvedTimePeriod}
          <span class="text-b2 text-fgs2">
            {resolveUpperRelativeTimePeriodTitle(
              scale ?? TimeScale.DAYS,
              periodValue.param
            )}
          </span>
        {/if}
        <div class="flex items-center gap-2 justify-between cw:flex-1">
          <!-- TODO - add absolute date range picker -->
          <div>
            <DropDown
              items={scales.map((x) => ({
                value: x
              }))}
              size={Size.sm}
              bind:value={scale}
              popoverWidth={"w-36"}
              isDisableSearch={true}
              on:select={(event) => {
                const val = event.detail;
                if (!val) return;
                refresh();
              }}
            />
          </div>
          <div class="flex items-center gap-2">
            <CardSelector {accessPoint} bind:selected={chartType} on:select />
            <Toggle
              icon="sliders"
              bgSize={Size.sm}
              bind:on={isShowOptions}
            />
          </div>
        </div>
      </div>
      {#if isShowOptions}
        <div
          class="flex flex-col gap-4 p-3 bg-bgs2 rounded-md"
          in:fly={{ y: -20, duration: 300 }}
        >
          <SwitchInput
            bind:checked={isIncludeSubgoals}
            label={{ label: "Include subgoals" }}
            isExpanded={true}
            on:change={(event) => {
              refresh();
            }}
          />
        </div>
      {/if}
      <div class="flex items-center gap-2">
        <div class="min-w-0 flex-1 pr-2">
          <OptionSelector
            options={timePeriodOptions}
            size={Size.sm}
            isPreventWrap={true}
            style={OptionSelectorStyle.OUTLINE}
            on:select={(event) => {
              const val = event.detail;
              const segments = val.split("#");
              if (!val) return;
              periodValue = {
                type: segments[0],
                param: parseInt(segments[1])
              };
              refresh();
            }}
          />
        </div>
      </div>
    </div>
  {/if}
  <div
    class={cn("relative w-full flex-1", {
      "cw:p-3 p-6": accessPoint === ResourceAccessPoint.GOAL
    })}
  >
    {#if isRefreshing}
      <EmptyStatusView
        isLoadingState={isRefreshing}
        loadingAnimation={LoadingAnimationType.ANALYTICS_CHART_PULSE}
      />
    {:else}
      {#key chartType}
        <AnalyticsChart
          chart={{
            period: {
              scale: scale ?? TimeScale.DAYS,
              value: periodValue
            },
            type: chartType,
            id: "analytics-chart-standalone"
          }}
          rawData={data}
          {goalColors}
        />
      {/key}
    {/if}
  </div>
</div>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.sessionLog])}
  on:change={() => {
    refresh();
  }}
/>
