<script lang="ts">
  import view from "@21n/ui/environment/view.store";
  import { TimeFormat } from "@21n/shared-utils/datetime/duration.type";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { formatSeconds } from "@21n/ui/elements/time/duration-format";
  import { cn } from "@21n/ui/environment/presentation";
  import PreviousValueColumnCell from "@nucleum/features/focus/analytics/cards/topN/PreviousValueColumnCell.svelte";

  let {
    value,
    previousValue = undefined,
    type = "total"
  }: {
    value: number;
    previousValue?: number;
    type?: "total" | "focus" | "break";
  } = $props();
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
      <PreviousValueColumnCell
        row={{ label: properCase(type), value, previousValue, color: 0 }}
      />
    {/if}
  </div>
</div>
