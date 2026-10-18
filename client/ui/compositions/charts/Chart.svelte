<script lang="ts">
  import type { ChartType } from "@21n/ui/compositions/charts/analytics.type";
  import EChart from "./EChart.svelte";
  import view from "@21n/ui/environment/view.store";
  let type: ChartType;
  let data: any;
  let options: any;
  let showLegend: boolean = true;

  export { type, data, options, showLegend };
</script>

<EChart
  {type}
  {data}
  {options}
  {showLegend}
  isConstrainedWidth={$view.isConstrainedWidth}
/>
