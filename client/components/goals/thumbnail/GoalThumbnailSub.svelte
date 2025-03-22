<script lang="ts">
  import GoalThumbnailDates from "./GoalThumbnailDates.svelte";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { formatDate } from "$lib/client/utils/time.utils";
  import type { IGoalThumb } from "../goal.type";
  export let item: IGoalThumb;
  export let isCurrentlyFocusing: boolean = false;
</script>

<span class="text-b3 text-fgs3 truncate text-left max-h-6">
  {#if isCurrentlyFocusing}
    Currently focusing...
  {:else if item.startDate || item.endDate}
    <GoalThumbnailDates {item} />
  {:else if item.description?.blocks?.[0]?.body}
    {@html renderMdAsHtml(
      typeof item.description.blocks?.[0]?.body === "string"
        ? item.description.blocks[0].body
        : ""
    )}
  {:else}
    <span class="text-left text-b3 text-fgs3">
      Created: {formatDate(new Date(item.createdAt))}
    </span>
  {/if}
</span>
