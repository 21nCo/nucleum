<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { TimeScale } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";

  export let scale: TimeScale;
  export let value: number;
  let label: string;
  if (scale === TimeScale.DAYS) {
    label = "Today so far";
  } else if (scale === TimeScale.MONTHS) {
    label = "This month so far";
  } else if (scale === TimeScale.YEARS) {
    label = "This year so far";
  }
</script>

<div
  class={cn("flex flex-col grow p-4 rounded-md bg-bgs2", {
    "h-20": $view.isPortrait,
    "h-30": !$view.isPortrait
  })}
>
  <div class="text-fgs2 {$view.isPortrait ? 'text-b3' : 'text-base'}">
    {label}
  </div>
  <div class={$view.isPortrait ? "text-h5" : "text-h2"}>
    {value ? formatSeconds(value) : "NA"}
  </div>
</div>
