<script lang="ts">
  import AnalyticsChartStandalone from "@21n/products/pointron/analytics/page/AnalyticsChartStandalone.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  export let id: IRecordId;
</script>

<div class="w-full h-full">
  <AnalyticsChartStandalone
    goalId={id}
    accessPoint={ResourceAccessPoint.GOAL}
  />
</div>
