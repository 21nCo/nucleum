<script lang="ts">
  import { parseAndFormatDate } from "$lib/client/utils/time.utils";
  import type { IGoalThumb } from "../goal.type";
  export let item: IGoalThumb;
</script>

{#if item.startDate || item.endDate}
  <span class="text-left text-b3 text-fgs3 default-typeface">
    {#if item.startDate}
      {parseAndFormatDate(item.startDate)}
    {/if}
    {#if item.endDate}
      - {parseAndFormatDate(item.endDate)}
    {/if}
  </span>
{/if}
