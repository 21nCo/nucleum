<script lang="ts">
  import view from "@21n/stores/view.store";
  import { formatSeconds } from "@21n/utils/time.utils";
  import type { TopNCardDataRecord } from "@21n/products/pointron/analytics/analytics.types";
  import PreviousValueColumnCell from "@21n/products/pointron/analytics/cards/topN/PreviousValueColumnCell.svelte";
  export let row: TopNCardDataRecord;
</script>

<span class="flex gap-2">
  <span class="min-w-fit text-b3 dp:text-b2 2k:text-base">
    {formatSeconds(row.value)}
  </span>
  <!-- {#if $view.isPortrait}
    <PreviousValueColumnCell {row} />
  {/if} -->
</span>
