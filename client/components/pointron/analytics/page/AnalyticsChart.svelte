<script lang="ts">
  import { ChartType } from "$lib/client/types/analytics.type";
  import Chart from "$lib/client/components/charts/Chart.svelte";
  import {
    determineTimePeriod,
    determineTimePeriodv2,
    formatDate,
    formatSeconds
  } from "$lib/client/utils/time.utils";
  import { pointronPreferences } from "$lib/client/components/pointron/pointron.store";
  import { appConstants } from "$lib/client/stores/app.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeScale } from "$lib/client/types/time.type";
  import { getCorrespoingHorizonFrequencyLabel } from "$lib/client/utils/time.utils";
  import {
    resolveSaturationAndLightness,
    retrieveCurrentColors
  } from "$lib/client/utils/theme.utils";
  import { ChartVariant } from "$lib/client/types/chartVariant.enum";
  import appearance from "$lib/client/stores/appearance.store";
  import {
    AnalyticsCardGrouping,
    AnalyticsCardType,
    type AnalyticsCard,
    type AnalyticsDataRecord,
    type ChartDataRecord
  } from "../analytics.types";
  import { cn } from "$lib/client/utils/ui.utils";
  import view from "$lib/client/stores/view.store";
  export let chart: AnalyticsCard;
  export let rawData: AnalyticsDataRecord[];
  export let goalColors: { label: string; color: number }[];
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
      percentage: chart.type === AnalyticsCardType.BAR,
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
            value: targetValue,
            fillColor: colors.aps1
          }
        ]
      };
    }
  }
  function resolveXValueForStackedBarChart(begin: Date) {
    if (chart.period.scale === TimeScale.DAYS) {
      return formatDate(begin, "mmm-dd");
    } else if (chart.period.scale === TimeScale.MONTHS) {
      return formatDate(begin, "mmm-yy");
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
            : chart.grouping === AnalyticsCardGrouping.TOP_LEVEL_GOALS
              ? r.topLevelGoal
              : r.goal,
        key:
          chart.type == AnalyticsCardType.BAR
            ? resolveXValueForStackedBarChart(new Date(r.start))
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
        barsWidth: xDomain.length < 10 ? 30 : xDomain.length < 15 ? 26 : 25
        // barsWidth: xDomain.length > 20 ? 10 : xDomain.length > 10 ? 20 : 30
      };
    }
    if (goalColors) {
      let values = resolveSaturationAndLightness(
        $appearance,
        appConstants.colorSchemeSLConfig
      );
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

    //if (chart.period.scale == TimeScale.DAYS)
    //console.log({ chart, data, options });
  }
</script>

<div
  class={cn("gap-2 w-full h-full flex flex-col justify-center items-center", {
    "p-4": !$view.isPortrait
  })}
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
        variant={chart.type == AnalyticsCardType.BAR
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
                : ChartType.AREA}
        {data}
        {options}
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
