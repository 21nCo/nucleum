<script lang="ts">
  import AnalyticsChartStandalone from "$lib/client/products/pointron/analytics/page/AnalyticsChartStandalone.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  export let id: IRecordId;
</script>

<div class="w-full h-full">
  <AnalyticsChartStandalone
    goalId={id}
    accessPoint={ResourceAccessPoint.GOAL}
  />
</div>
