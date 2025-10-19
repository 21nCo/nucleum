<script lang="ts">
  import type { ChartType } from "@21n/types/analytics.type";
  import { ChartVariant } from "@21n/types/chartVariant.enum";
  import CarbonChart from "@21n/components/charts/CarbonChart.svelte";
  import CustomChart from "@21n/components/charts/custom/CustomChart.svelte";
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
