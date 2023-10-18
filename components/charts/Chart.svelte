<script lang="ts">
  import type { ChartType } from "$lib/tidy/types/analytics.type";
  import CarbonChart from "./CarbonChart.svelte";
  export let type: ChartType;
  export let data: any;
  export let options: any;
</script>

<CarbonChart {type} {data} additionalOptions={options} />
