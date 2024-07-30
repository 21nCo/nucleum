<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import PreviousValueColumnCell from "../topN/PreviousValueColumnCell.svelte";
  export let value: number;
  export let previousValue: number;
  export let type: "total" | "focus" | "break" = "total";
</script>

<div
  class={cn(
    "flex flex-col items-start justify-between border border-brs3 rounded-md min-w-fit grow",
    {
      "p-2 h-20 bg-bgs2": $view.isPortrait,
      "p-4 h-[7rem]": !$view.isPortrait
    }
  )}
>
  <div
    class={cn({
      "text-b2": $view.isPortrait
    })}
  >
    {properCase(type)}
  </div>
  <div class="flex gap-2">
    <div
      class={cn("font-medium min-w-fit", {
        "text-aps1": type === "focus",
        "text-ass1": type === "break",
        "text-base": $view.isPortrait,
        "text-h2": !$view.isPortrait
      })}
    >
      {formatSeconds(value, TimeFormat.VERBOSE)}
    </div>
    <PreviousValueColumnCell row={{ value, previousValue }} />
  </div>
</div>
