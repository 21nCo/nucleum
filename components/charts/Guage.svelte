<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { ChartTheme, GaugeChart } from "@carbon/charts-svelte";
  import "@carbon/charts-svelte/styles.css";
  import { onMount } from "svelte";
  export let label: string;
  export let total: number | undefined = undefined;
  export let actual: number | undefined = undefined;
  export let percentage: number | undefined = undefined;
  let options: any;
  let data: any;
  onMount(() => {
    try {
      data = [
        {
          group: "value",
          value:
            percentage ??
            (actual && total ? (total - actual / total) * 100 : 0),
        },
      ];
      options = {
        title: label,
        height: "250px",
        guage: {
          type: "full",
        },
        theme: $userPreferences.colorScheme.isDark
          ? ChartTheme.G100
          : ChartTheme.WHITE,
      };
      console.log({ data, options });
    } catch (e) {
      console.error(e);
    }
  });
</script>

<div>
  {label}
  <GaugeChart {data} {options} />
</div>
