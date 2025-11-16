<script lang="ts">
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  export let item: IGoalThumb;
</script>

{#if item.startDate || item.endDate}
  <span class="text-left text-b3 text-fgs3">
    {#if item.startDate}
      {parseAndFormatDate(item.startDate)}
    {/if}
    {#if item.endDate}
      - {parseAndFormatDate(item.endDate)}
    {/if}
  </span>
{/if}
