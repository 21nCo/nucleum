<script lang="ts">
  import type { ChartType } from "@21n/types/analytics.type";
  import EChart from "./EChart.svelte";
  import view from "@21n/stores/view.store";
  export let type: ChartType;
  export let data: any;
  export let options: any;
  export let showLegend: boolean = true;
</script>

<EChart
  {type}
  {data}
  {options}
  {showLegend}
  isConstrainedWidth={$view.isConstrainedWidth}
/>
