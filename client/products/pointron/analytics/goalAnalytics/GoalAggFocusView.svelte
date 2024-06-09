<script lang="ts">
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  import view from "$lib/client/stores/view.store";
  import { TimeScale } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";

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

<BackgroundElement
  class="flex flex-col grow p-4 rounded-md {$view.isPortrait ? 'h-20' : 'h-30'}"
>
  <div class="text-fgs2 {$view.isPortrait ? 'text-b3' : 'text-base'}">
    {label}
  </div>
  <div class={$view.isPortrait ? "text-h5" : "text-h2"}>
    {value ? formatSeconds(value) : "NA"}
  </div>
</BackgroundElement>
