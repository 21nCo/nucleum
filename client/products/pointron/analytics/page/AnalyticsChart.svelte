<script lang="ts">
  import { ChartType } from "@21n/types/analytics.type";
  import Chart from "@21n/components/charts/Chart.svelte";
  import {
    determineTimePeriod,
    determineTimePeriodv2,
    parseAndFormatDate,
    formatSeconds
  } from "@21n/utils/time.utils";
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import { appConstants } from "@21n/stores/app.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/types/size.enum";
  import { TimeScale } from "@21n/types/time.type";
  import { getCorrespoingHorizonFrequencyLabel } from "@21n/utils/time.utils";
  import {
    resolveSaturationAndLightness,
    retrieveCurrentColors
  } from "@21n/utils/theme.utils";
  import { ChartVariant } from "@21n/types/chartVariant.enum";
  import appearance from "@21n/stores/appearance.store";
  import {
    AnalyticsCardGrouping,
    AnalyticsCardType,
    type IAnalyticsCard,
    type AnalyticsDataRecord,
    type ChartDataRecord,
    type IAnalyticsLabelColor
  } from "@21n/products/pointron/analytics/analytics.types";
  import { cn } from "@21n/utils/ui.utils";
  import view from "@21n/stores/view.store";
  export let chart: IAnalyticsCard;
  export let rawData: AnalyticsDataRecord[];
  export let goalColors: IAnalyticsLabelColor[];
  export let showLegend: boolean = true;
  let data: ChartDataRecord[];
  let options: any;
  let isLoadingState = true;
  const colors = retrieveCurrentColors($appearance);
  isLoadingState = false;

  initialize();

  function initialize() {
    setBaseOptions();
    initializeData();
    setOptions();
    setTargetLine();
    postProcessData();
  }

  function setBaseOptions() {
    options = {
      ...(chart.type === AnalyticsCardType.BAR
        ? { stackedBarMode: chart.stackedBarMode ?? "value" }
        : {}),
      color: {
        scale: {}
      },
      donutLabel: "Total focus",
      donutFormatter: (value: any) => {
        return formatSeconds(value * 60 * 60);
      },
      timeInterval: chart.period.scale,
      timeIntervalFormats: {
        daily: {
          primary: "y MMM d",
          secondary: "d"
        }
      },
      xScale: chart.type == AnalyticsCardType.BAR && "labels"
    };
  }
  function setTargetLine() {
    const targetValue = $pointronPreferences.horizonTargets?.find(
      (x) => x.scale === chart.period.scale
    )?.target;
    if (targetValue) {
      options = {
        ...options,
        yThresholds: [
          {
            label:
              getCorrespoingHorizonFrequencyLabel(chart.period.scale) +
              " target",
            value: targetValue / (60 * 60),
            fillColor: colors.aps1
          }
        ]
      };
    }
  }
  function resolveXValueForStackedBarChart(begin: Date) {
    if (chart.period.scale === TimeScale.DAYS) {
      return parseAndFormatDate(begin, "mmm-dd");
    } else if (chart.period.scale === TimeScale.MONTHS) {
      return parseAndFormatDate(begin, "mmm-yy");
    } else if (chart.period.scale === TimeScale.YEARS) {
      return `${begin.getFullYear()}`;
    }
  }
  function initializeData() {
    if (!rawData) return;
    data = rawData.map((r: any) => {
      const focus = $pointronPreferences.isIncludeBreakInAnalytics
        ? r.focus + r.brek
        : r.focus;
      return {
        topLevelGoal: r.topLevelGoal,
        group:
          r.goal === null
            ? "Other"
            : chart.isGroupByTopLevelGoals
              ? r.topLevelGoal
              : r.goal,
        key:
          chart.type == AnalyticsCardType.BAR
            ? resolveXValueForStackedBarChart(new Date(r.start))
            : chart.type == AnalyticsCardType.LINE ||
                chart.type === AnalyticsCardType.AREA
              ? new Date(r.start.setHours(0, 0, 0, 0))
              : chart.type === AnalyticsCardType.CALENDAR ||
                  chart.type === AnalyticsCardType.HOURLY ||
                  chart.type === AnalyticsCardType.HOURLY_HEATMAP
                ? new Date(r.start)
                : r.start,
        value: +(+focus / (60 * 60)).toFixed(2)
      };
    });
  }
  /**
   * This should be run towards the end of the steps since goal color resolution depends on data object.
   */
  function postProcessData() {
    if (
      chart.type === AnalyticsCardType.PIE ||
      chart.type === AnalyticsCardType.DONUT
    ) {
      let result = data.reduce((r: any, x: any) => {
        r[x.group] = (r[x.group] || 0) + x.value;
        return r;
      }, {});
      data = Object.keys(result).map((key) => {
        return {
          group: key,
          key,
          value: result[key]
        };
      });
    } else if (
      chart.type === AnalyticsCardType.LINE ||
      chart.type === AnalyticsCardType.AREA
    ) {
      const val = data.reduce((acc: { [key: string]: any }, cur) => {
        const key = `${cur.group}-${cur.key}`;
        if (acc[key]) {
          acc[key].value += cur.value;
        } else {
          acc[key] = { ...cur };
        }
        return acc;
      }, {});
      data = Object.values(val);
      data.sort(
        (a: { key: string }, b) =>
          new Date(a.key).getTime() - new Date(b.key).getTime()
      );
    } else if (
      chart.type === AnalyticsCardType.CALENDAR ||
      chart.type === AnalyticsCardType.HOURLY ||
      chart.type === AnalyticsCardType.HOURLY_HEATMAP
    ) {
      const dayMap = data.reduce((acc: { [key: string]: number }, cur) => {
        const date = new Date(cur.key);
        const dateKey =
          chart.type === AnalyticsCardType.CALENDAR
            ? date.toISOString().split("T")[0]
            : cur.key;
        acc[dateKey] = (acc[dateKey] || 0) + cur.value;
        return acc;
      }, {});
      data = Object.keys(dayMap).map((key) => ({
        key,
        value: dayMap[key]
      }));
      data.sort(
        (a: { key: string }, b: { key: string }) =>
          new Date(a.key).getTime() - new Date(b.key).getTime()
      );
    } else if (
      chart.type === AnalyticsCardType.SUNBURST ||
      chart.type === AnalyticsCardType.TREEMAP
    ) {
      const hierarchicalMap = data.reduce(
        (acc: { [key: string]: any }, cur) => {
          const compositeKey = `${cur.topLevelGoal}-${cur.group}`;
          if (acc[compositeKey]) {
            acc[compositeKey].value += cur.value;
          } else {
            acc[compositeKey] = { ...cur };
          }
          return acc;
        },
        {}
      );
      data = Object.values(hierarchicalMap);
    }
  }
  /**
   * Set options for the chart like domain, color scale etc.
   */
  function setOptions() {
    let period = determineTimePeriodv2(chart.period);
    if (chart.type == AnalyticsCardType.BAR) {
      let xDomain = [];
      let begin = new Date(period.begin);
      let end = new Date(period.end);
      while (begin <= end) {
        xDomain.push(resolveXValueForStackedBarChart(begin));
        if (chart.period.scale === TimeScale.DAYS) {
          begin.setDate(begin.getDate() + 1);
        } else if (chart.period.scale === TimeScale.MONTHS) {
          begin.setMonth(begin.getMonth() + 1);
        } else if (chart.period.scale === TimeScale.YEARS) {
          begin.setFullYear(begin.getFullYear() + 1);
        }
      }
      options = {
        ...options,
        xDomain: xDomain,
        barsWidth: Math.round(450 / xDomain.length)
        // barsWidth: xDomain.length > 20 ? 10 : xDomain.length > 10 ? 20 : 30
      };
    }
    if (goalColors) {
      let values = resolveSaturationAndLightness($appearance);
      if (!values) return;
      for (let item of goalColors) {
        const hueForOther = 10;
        options.color.scale["Other"] =
          `hsl(${hueForOther}, ${values.saturation}%, ${values.lightness}%)`;
        if (data.some((x: any) => x.group == item.label)) {
          options.color.scale[item.label] =
            `hsl(${item.color}, ${values.saturation}%, ${values.lightness}%)`;
        }
        if (data.some((x: any) => x.topLevelGoal == item.label)) {
          const x = data.filter((x: any) => x.topLevelGoal == item.label);
          x.forEach((y: any) => {
            options.color.scale[y.group] =
              `hsl(${item.color}, ${values.saturation}%, ${values.lightness}%)`;
          });
        }
      }
    }
  }
</script>

<div
  class={cn(
    "gap-2 w-full h-full flex flex-col justify-center items-center userdata",
    {
      "p-2": !$view.isPortrait
    }
  )}
>
  {#if options && data && data.length > 0}
    <div
      class={cn("flex w-full justify-center", {
        "h-4/5":
          $view.isPortrait &&
          (chart.type === AnalyticsCardType.PIE ||
            chart.type === AnalyticsCardType.DONUT),
        "h-full":
          !$view.isPortrait ||
          (chart.type !== AnalyticsCardType.PIE &&
            chart.type !== AnalyticsCardType.DONUT)
      })}
    >
      <Chart
        variant={chart.type == AnalyticsCardType.BAR ||
        chart.type === AnalyticsCardType.CALENDAR ||
        chart.type === AnalyticsCardType.HOURLY ||
        chart.type === AnalyticsCardType.HOURLY_HEATMAP ||
        chart.type === AnalyticsCardType.SUNBURST ||
        chart.type === AnalyticsCardType.TREEMAP
          ? ChartVariant.CUSTOM
          : ChartVariant.CARBON}
        type={chart.type == AnalyticsCardType.BAR
          ? ChartType.STACKEDBAR
          : chart.type === AnalyticsCardType.PIE
            ? ChartType.PIE
            : chart.type === AnalyticsCardType.DONUT
              ? ChartType.DOUGHNUT
              : chart.type === AnalyticsCardType.LINE
                ? ChartType.LINE
                : chart.type === AnalyticsCardType.CALENDAR
                  ? ChartType.CALENDAR
                  : chart.type === AnalyticsCardType.HOURLY
                    ? ChartType.HOURLY
                    : chart.type === AnalyticsCardType.HOURLY_HEATMAP
                      ? ChartType.HOURLY_HEATMAP
                      : chart.type === AnalyticsCardType.SUNBURST
                        ? ChartType.SUNBURST
                        : chart.type === AnalyticsCardType.TREEMAP
                          ? ChartType.TREEMAP
                          : ChartType.AREA}
        {data}
        {options}
        {showLegend}
      />
      <!-- <Chart variant={ChartVariant.CARBON} type={chart.type} {data} {options} /> -->
    </div>
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      mainText="No data available"
      subText="Please come back after you focus for this time period or choose a different time period."
    />
  {/if}
</div>
