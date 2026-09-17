<script lang="ts">
  import { onMount } from "svelte";
  import "@carbon/charts/styles.css";
  import { ChartType } from "@nucleum/components/charts/analytics.type";
  import {
    ChartTheme,
    GaugeChart,
    type ChartOptions,
    Alignments
  } from "@carbon/charts-svelte";
  import { retrieveCurrentColors } from "@21n/utils/theme.utils";
  import appearance from "@nucleum/stores/appearance.store";
  let type: ChartType;
  let data: any;
  let additionalOptions: any;

  export { type, data, additionalOptions };

  let isShow: boolean = false;
  let currentColors = retrieveCurrentColors($appearance);
  let options: ChartOptions = {
    height: "100%",
    width: "100%",
    resizable: true,
    animations: false,
    theme: $appearance.colorScheme.isDark ? ChartTheme.G100 : ChartTheme.WHITE,
    toolbar: {
      enabled: false
    },
    ...additionalOptions,
    gauge: {
      type: additionalOptions?.guageType ?? "full",
      arcWidth: additionalOptions?.arcWidth ?? 10,
      alignment: Alignments.CENTER,
      showPercentageSymbol: false,
      numberFormatter: (d: any) => {
        return parseFloat(d).toFixed(0) + " %";
      },
      valueFontSize: additionalOptions.valueFontSize
    },
    legend: {
      enabled: false
    },
    color: {
      scale: {
        value: currentColors?.aps1!
      }
    }
  };
  onMount(() => {
    alterGuageArcBackground();
    let skel = document.getElementsByClassName("cds--cc--skeleton");
    for (let i = 0; i < skel.length; i++) {
      let sk = skel[i] as HTMLElement;
      sk.style.width = "100%";
    }
    setTimeout(() => {
      isShow = true;
    }, 10);
  });

  function alterGuageArcBackground() {
    let guageArcBackground = document.getElementsByClassName("arc-background");
    if (!guageArcBackground || guageArcBackground.length === 0) return;
    for (let i = 0; i < guageArcBackground.length; i++) {
      let guageArc = guageArcBackground[i] as HTMLElement;
      guageArc.style.fill = currentColors?.aps2!;
    }
  }
</script>

<div
  class="flex w-full h-full justify-center items-center {isShow
    ? ''
    : 'opacity-0'}"
>
  <GaugeChart {data} {options} />
</div>
