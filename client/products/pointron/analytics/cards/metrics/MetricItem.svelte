<script lang="ts">
  import view from "@21n/stores/view.store";
  import { TimeFormat } from "@21n/types/time.type";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { formatSeconds } from "@21n/utils/time.utils";
  import { cn } from "@21n/utils/ui.utils";
  import PreviousValueColumnCell from "@21n/products/pointron/analytics/cards/topN/PreviousValueColumnCell.svelte";
  export let value: number;
  export let previousValue: number | undefined = undefined;
  export let type: "total" | "focus" | "break" = "total";
</script>

<div
  class={cn(
    "flex flex-col items-start justify-between border border-brs3 rounded-md min-w-fit grow",
    {
      "p-2 h-16 bg-bgs2": $view.isPortrait,
      "p-2 h-fit": !$view.isPortrait
    }
  )}
>
  <div class="text-b2">
    {properCase(type)}
  </div>
  <div class="flex items-center gap-2">
    <div
      class={cn("font-medium min-w-fit text-base dp:text-h4 2k:text-h3", {
        "text-aps1": type === "focus",
        "text-ass1": type === "break"
      })}
    >
      {formatSeconds(value, TimeFormat.VERBOSE)}
    </div>
    {#if previousValue}
      <PreviousValueColumnCell row={{ value, previousValue }} />
    {/if}
  </div>
</div>
