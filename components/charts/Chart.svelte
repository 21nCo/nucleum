<script lang="ts">
  import type { ChartType } from "$lib/tidy/types/analytics.type";
  import { ChartVariant } from "$lib/tidy/types/chartVariant.enum";
  import CarbonChart from "./CarbonChart.svelte";
  import CustomChart from "./custom/CustomChart.svelte";
  export let type: ChartType;
  export let data: any;
  export let options: any;
  export let variant: ChartVariant = ChartVariant.CARBON;
</script>

{#if variant === ChartVariant.CARBON}
  <CarbonChart {type} {data} additionalOptions={options} />
{:else if variant === ChartVariant.CUSTOM}
  <CustomChart on:fetch-data {type} {data} additionalOptions={options} />
{/if}
