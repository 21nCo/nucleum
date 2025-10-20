<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import { isValidString, properCase } from "@21n/shared-utils/text.utils";
  import {
    NodeType,
    type INode
  } from "@21n/products/memotron/node/node.type";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import CollectionTitleLabelPart from "@21n/components/collection/thumbnail/CollectionThumbnailLabel.svelte";
  import type {
    CollectionType,
    ICollectionThumb
  } from "@21n/components/collection/collection.type";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import NodeTitleLabelPart from "@21n/products/memotron/node/title/NodeTitleLabelPart.svelte";
  import GoalSearchResultItem from "@21n/components/goals/GoalSearchResultItem.svelte";
  import type {
    GoalType,
    IGoalThumb
  } from "@21n/components/goals/goal.type";
  import { resolveNodeContentLabel } from "@21n/products/memotron/node/node.utils";
  import { resolveCollectionTypeLabel } from "@21n/components/collection/collection.utils";
  import { resolveGoalTypeLabel } from "@21n/components/goals/goal.utils";
  export let item: INode | ICollectionThumb | IGoalThumb;
  export let isHideResourceType: boolean = false;
  export let resourceType: Resource = determineResourceType(item.id);
  const subType = resourceType === Resource.node ? item.contentType : item.type;

  function resolveSubTypeLabel(subType: string) {
    if (resourceType === Resource.node) {
      return resolveNodeContentLabel(subType as NodeType);
    } else if (resourceType === Resource.collection) {
      return (
        resolveCollectionTypeLabel(subType as CollectionType) + " collection"
      );
    } else if (resourceType === Resource.goal) {
      return resolveGoalTypeLabel(subType as GoalType) + " goal";
    } else return "";
  }
</script>

<!-- TODO - improve search results - to show image preview, tweet preview, etc -->
<button
  class={cn(
    "flex w-full gap-6 justify-between items-center px-1 cw:py-1 py-2 min-h-fit"
  )}
  on:click
  on:mousedown={(e) => e.preventDefault()}
>
  <span
    class={cn("flex flex-col h-full truncate", {
      "w-full": isHideResourceType,
      "mo:w--4/5 w--3/4 min-w-0 flex-1": !isHideResourceType,
      "font--mono italic-":
        !isHideResourceType && resourceType === Resource.collection
    })}
  >
    {#if resourceType === Resource.node}
      <div class="flex gap-2 w-full truncate text-b2">
        <NodeTitleLabelPart
          {item}
          accessPoint={ResourceAccessPoint.SEARCH_RESULT}
        />
      </div>
      {#if item.bodySearch}
        <div
          class="text-left text-b2 text-fgs3 text-opacity-80 max-h-12 overflow-hidden"
        >
          {@html renderMdAsHtml(item.bodySearch)}
        </div>
      {/if}
    {:else if resourceType === Resource.collection}
      <CollectionTitleLabelPart {item} isShowFallbackIcons={true} />
    {:else if resourceType === Resource.goal}
      <GoalSearchResultItem {item} />
    {:else}
      <div class="flex text-left line-clamp-1 truncate">
        {isValidString(item.label) ? item.label : "Untitled"}
      </div>
    {/if}
  </span>
  {#if !isHideResourceType && (isValidString(subType) || isValidString(resourceType))}
    <span
      class="cw:text-b4 text-b3 text-fgs3 border border-brs2 rounded-md cw:px-1.5 px-2 py-0.5"
      >{properCase(subType ? resolveSubTypeLabel(subType) : resourceType)}</span
    >
  {/if}
</button>
