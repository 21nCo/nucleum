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
    type ChartOptions,
  } from "@carbon/charts-svelte";
  export let type: ChartType;
  export let data: any;
  export let additionalOptions: any;
  let options: ChartOptions;
  let isShow: boolean = false;
  let stackedBarChartRef: any;
  let defaultOptions = {
    axes: {
      left: {
        mapsTo: "value",
        scaleType: ScaleTypes.LINEAR,
      },
      bottom: {
        mapsTo: "key",
        scaleType: ScaleTypes.TIME,
      },
    },
    height: "100%",
    width: "100%",
    grid: false,
    bars: {
      width: 30,
      maxWidth: 30,
    },
    labels: {
      enabled: true,
    },
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
      clickable: true,
      truncation: {
        // threshold: 50,
        numCharacter: 20,
      },
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
      if (type === ChartType.STACKEDBAR) {
        paintAdditionalBarOptions();
      }
    }, 10);
    setTimeout(() => {
      isShow = true;
    }, 100);
  });

  function initializeOptions() {
    if (type === ChartType.STACKEDBAR) {
      options = {
        ...defaultOptions,
        axes: {
          left: {
            mapsTo: "value",
            stacked: true,
            scaleType: ScaleTypes.LINEAR,
          },
          bottom: {
            mapsTo: "key",
            scaleType: ScaleTypes.TIME,
          },
        },
        ...additionalOptions,
      };
    } else if (type === ChartType.STACKEDAREA) {
      options = {
        ...defaultOptions,
        axes: {
          left: {
            mapsTo: "value",
            stacked: true,
            percentage: additionalOptions?.percentage,
            scaleType: ScaleTypes.LINEAR,
          },
          bottom: {
            mapsTo: "key",
            scaleType: ScaleTypes.TIME,
          },
        },
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
    // console.log({ backdro, backdrops });
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

  function paintAdditionalBarOptions() {
    if (stackedBarChartRef) {
      console.log({ stackedBarChartRef });
    }
    // // Adding the totals on bars
    // data.forEach((d: any, i: any) => {
    //   const bar = stackedBarChartRef.getSVGRefs().nodes[i];

    //   // Create text elements for the totals
    //   const total = document.createElementNS(
    //     "http://www.w3.org/2000/svg",
    //     "text"
    //   );
    //   total.textContent = d.value;

    //   // Position the totals on the top of the bars
    //   const bbox = bar.getBBox();
    //   const x = bbox.x + bbox.width / 2;
    //   const y = bbox.y;

    //   // Set attributes and append to the chart SVG
    //   total.setAttribute("x", x);
    //   //total.setAttribute("y", y - 5); // 5px offset to position it above the bar
    //   stackedBarChartRef.getSVGRefs().holder.appendChild(total);
    // });

    // let sums = [1, 2, 3, 4];
    // const chartSVG = document.querySelector(".bx--cc--chart-svg");
    // sums.forEach((sum, idx) => {
    //   let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    //   text.setAttribute("x" /* x-coordinate based on idx */);
    //   text.setAttribute("y" /* y-coordinate based on sum or other measures */);
    //   text.textContent = sum;
    //   chartSVG?.appendChild(text);
    // });
  }
</script>

<div
  class="flex w-full h-full justify-center items-center {isShow
    ? ''
    : 'opacity-0'}"
>
  {#if data && options}
    {#if type === ChartType.STACKEDBAR}
      <BarChartStacked bind:this={stackedBarChartRef} {data} {options} />
    {:else if type === ChartType.BAR}
      <BarChartSimple {data} {options} />
    {:else if type === ChartType.LINE}
      <LineChart {data} {options} />
    {:else if type === ChartType.STACKEDAREA}
      <StackedAreaChart {data} {options} />
    {:else if type === ChartType.AREA}
      <AreaChart {data} {options} />
    {:else if type === ChartType.PIE}
      <DonutChart {data} {options} />
    {:else}
      <div>Chart type not supported yet</div>
    {/if}
  {/if}
</div>
