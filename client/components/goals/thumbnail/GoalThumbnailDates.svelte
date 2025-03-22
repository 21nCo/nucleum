<script lang="ts">
  import { formatDate } from "$lib/client/utils/time.utils";
  import type { IGoalThumb } from "../goal.type";
  export let item: IGoalThumb;
</script>

{#if item.startDate || item.endDate}
  <span class="text-left text-b3 text-fgs3">
    {#if item.startDate}
      {formatDate(item.startDate)}
    {/if}
    {#if item.endDate}
      - {formatDate(item.endDate)}
    {/if}
  </span>
{/if}
