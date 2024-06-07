<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { TopNCardDataRecord } from "../../analytics.types";
  export let row: TopNCardDataRecord;
  $: colors = retrieveCurrentColors($appearance);
</script>

<span
  class={cn("text-fgs3 flex h-full w-full items-center", {
    "text-b4": $view.isPortrait,
    "text-b3": !$view.isPortrait
  })}
>
  <span class="flex items-center gap-1">
    <Icon
      icon={row.value > row.previousValue ? "arrow-up" : "arrow-down"}
      color={row.value > row.previousValue ? colors.ags1 : colors.ars1}
      size={Size.sm}
    />
    {formatSeconds(Math.abs(row.value - row.previousValue))}
  </span>
</span>
