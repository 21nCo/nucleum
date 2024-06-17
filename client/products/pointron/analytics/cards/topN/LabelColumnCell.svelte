<script lang="ts">
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import view from "$lib/client/stores/view.store";
  import { determineTruncateLength } from "$lib/client/utils/text.utils";
  import type { TopNCardDataRecord } from "../../analytics.types";
  export let row: TopNCardDataRecord;
</script>

<span class="flex items-center gap-2">
  <ActiveBackgroundElement
    color={row.color}
    isBackgroundActive={true}
    class="w-2 h-2 rounded-md"
  />
  <span class="min-w-fit">
    <TextWithHoverTooltip
      text={row.label}
      truncateLength={determineTruncateLength($view.display)}
    />
  </span>
</span>
