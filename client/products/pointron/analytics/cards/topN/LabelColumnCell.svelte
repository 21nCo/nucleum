<script lang="ts">
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
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
    {row.label}
  </span>
</span>
