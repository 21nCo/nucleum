<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { retrieveCurrentColors } from "$lib/tidy/utils/utils";
  import { onMount } from "svelte";
  import "@carbon/charts-svelte/styles.css";
  import { ChartType } from "$lib/tidy/types/analytics.type";
  import {
    AreaChart,
    BarChartSimple,
    BarChartStacked,
    ChartTheme,
    DonutChart,
    LineChart,
    ScaleTypes,
    StackedAreaChart,
  } from "@carbon/charts-svelte";
  export let type: ChartType;
  export let data: any;
  export let additionalOptions: any;
  let options: any;
  let isShow: boolean = false;
  let defaultOptions = {
    axes: {
      left: {
        mapsTo: "value",
        // stacked: true,
        scaleType: ScaleTypes.LINEAR,
      },
      bottom: {
        mapsTo: "key",
        scaleType: ScaleTypes.LABELS,
      },
    },
    height: "100%",
    width: "100%",
    // alignment: "center",
    theme: $userPreferences.colorScheme.isDark
      ? ChartTheme.G100
      : ChartTheme.WHITE,
    zoomBar: {
      top: {
        enabled: false,
      },
    },
    tooltip: {
      valueFormatter: (d: any) => d,
    },
    legend: {
      enabled: true,
      alignment: "center",
      position: "bottom",
    },
    toolbar: {
      enabled: false,
    },
  };
  let currentColors = retrieveCurrentColors($userPreferences);
  onMount(() => {
    initializeOptions();
    setTimeout(() => {
      manipulateCarbonToTidy();
    }, 10);
    setTimeout(() => {
      isShow = true;
    }, 100);
    console.log({ options });
  });

  function initializeOptions() {
    if (type === ChartType.BAR) {
      options = { ...defaultOptions, ...additionalOptions };
    } else if (type === ChartType.AREA) {
      options = {
        ...defaultOptions,
        ...additionalOptions,
        curve: "curveMonotoneX",
      };
    } else if (type === ChartType.PIE) {
      options = {
        ...defaultOptions,
        ...additionalOptions,
        resizable: true,
        donut: {
          center: {
            label: "Total hours",
            // number: 100000,
          },
        },
        width: "75%",
      };
    }
  }

  function manipulateCarbonToTidy() {
    let backdrops = document.getElementsByClassName("chart-grid-backdrop");
    let backdro = document.getElementsByClassName(
      "chart-grid-backdrop"
    )[1] as HTMLElement;
    console.log({ backdro, backdrops });
    for (let i = 0; i < backdrops.length; i++) {
      let backdrop = backdrops[i] as HTMLElement;
      backdrop.style.fill = currentColors?.bgs1!;
    }
    if (backdro) {
      backdro.style.fill = currentColors?.bgs1!;
    }
    // let mainDonutFigure = document.getElementsByClassName(
    //   "donut-figure"
    // )[0] as HTMLElement;
    // if (mainDonutFigure) {
    //   mainDonutFigure.style.fill = currentColors?.fgs1!;
    //   mainDonutFigure.style.fontSize = "5rem";
    // }
  }
</script>

<div
  class="flex w-full h-full justify-center items-center {isShow
    ? ''
    : 'opacity-0'}"
>
  {#if data && options}
    {#if type === ChartType.BAR}
      <!-- <BarChartStacked {data} {options} /> -->
      <BarChartSimple {data} {options} />
    {:else if type === ChartType.LINE}
      <LineChart {data} {options} />
    {:else if type === ChartType.AREA}
      <!-- <StackedAreaChart {data} {options} style="padding:2rem;" /> -->
      <AreaChart {data} {options} />
    {:else if type === ChartType.PIE}
      <DonutChart {data} {options} />
    {:else}
      <div>Chart type not supported yet</div>
    {/if}
  {/if}
</div>
