<script lang="ts">
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import view from "$lib/client/stores/view.store";
  import { determineTruncateLength } from "$lib/client/utils/text.utils";
  import type { TopNCardDataRecord } from "../../analytics.types";
  export let row: TopNCardDataRecord;
</script>

<span class="flex items-center gap-2">
  <CustomColorPropagator color={row.color} class="w-2 h-2 rounded-md bg-ccs1" />
  <span class="min-w-fit">
    <TextWithHoverTooltip
      text={row.label}
      truncateLength={determineTruncateLength($view.display)}
    />
  </span>
</span>
