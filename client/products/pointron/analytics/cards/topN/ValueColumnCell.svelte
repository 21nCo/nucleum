<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { TopNCardDataRecord } from "../../analytics.types";
  import PreviousValueColumnCell from "./PreviousValueColumnCell.svelte";
  export let row: TopNCardDataRecord;
</script>

<span class="flex gap-2">
  <span
    class={cn("min-w-fit", {
      "text-b2": $view.isPortrait
    })}
  >
    {formatSeconds(row.value)}
  </span>
  {#if $view.isPortrait}
    <PreviousValueColumnCell {row} />
  {/if}
</span>
