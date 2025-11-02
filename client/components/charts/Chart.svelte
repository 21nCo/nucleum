<script lang="ts">
  import type { ChartType } from "@21n/types/analytics.type";
  import { ChartVariant } from "@21n/types/chartVariant.enum";
  import EChart from "./EChart.svelte";
  export let type: ChartType;
  export let data: any;
  export let options: any;
  export let variant: ChartVariant = ChartVariant.CARBON;
  export let showLegend: boolean = true;
</script>

<EChart {type} {data} {options} {showLegend} />
