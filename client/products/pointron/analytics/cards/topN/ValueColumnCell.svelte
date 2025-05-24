<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import type { TopNCardDataRecord } from "../../analytics.types";
  import PreviousValueColumnCell from "./PreviousValueColumnCell.svelte";
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
