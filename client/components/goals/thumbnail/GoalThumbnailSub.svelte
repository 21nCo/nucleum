<script lang="ts">
  import GoalThumbnailDates from "./GoalThumbnailDates.svelte";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { parseAndFormatDate } from "$lib/client/utils/time.utils";
  import { GoalType, type IGoalThumb } from "../goal.type";
  import GoalThumbnailSubBadge from "./GoalThumbnailSubBadge.svelte";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  export let item: IGoalThumb;
  export let isCurrentlyFocusing: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
</script>

<div class="flex justify-between items-center gap-1">
  {#if isCurrentlyFocusing || (item.type === GoalType.DEFINITE && (item.startDate || item.endDate)) || (item.description && item.description?.blocks?.[0]?.body)}
    <div class="text-b3 text-fgs3 truncate text-left max-h-5">
      {#if isCurrentlyFocusing}
        <span class="text-ccs1"> Currently focusing... </span>
      {:else if item.type === GoalType.DEFINITE && (item.startDate || item.endDate)}
        <GoalThumbnailDates {item} />
      {:else if item.description?.blocks?.[0]?.body}
        {@html renderMdAsHtml(
          typeof item.description.blocks?.[0]?.body === "string"
            ? item.description.blocks[0].body
            : ""
        )}
        <!-- {:else}
      <span class="text-left text-b3 text-fgs3">
        Created: {formatDate(new Date(item.createdAt))}
        </span> -->
      {/if}
    </div>
  {/if}
  {#if accessPoint !== ResourceAccessPoint.PICKER}
    <GoalThumbnailSubBadge {item} />
  {/if}
</div>
