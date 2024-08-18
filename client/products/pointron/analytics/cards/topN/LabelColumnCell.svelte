<script lang="ts">
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import type { TopNCardDataRecord } from "../../analytics.types";
  export let row: TopNCardDataRecord;
</script>

<span class="flex items-center gap-2">
  <CustomColorPropagator
    color={row.color}
    class="w-2 h-2 shrink-0 rounded-md bg-ccs1"
  />
  <span class="w-32 grow">
    <TextWithHoverTooltip text={row.label} class="truncate" />
  </span>
</span>
