<script lang="ts">
  import AnalyticsChartStandalone from "@21n/products/pointron/analytics/page/AnalyticsChartStandalone.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { ResourceAccessPoint } from "@21n/data/datafn/resource.type";

  let { id }: { id: IRecordId } = $props();
</script>

<div class="w-full h-full">
  <AnalyticsChartStandalone
    objectiveId={id}
    accessPoint={ResourceAccessPoint.OBJECTIVE}
  />
</div>
