<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import { isValidString, properCase } from "@21n/shared-utils/text.utils";
  import {
    NodeType,
    type INodeThumb
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
  let {
    item,
    isHideResourceType = false,
    resourceType = undefined,
    onClick = undefined
  }: {
    item: INodeThumb | ICollectionThumb | IGoalThumb;
    isHideResourceType?: boolean;
    resourceType?: Resource | undefined;
    onClick?: ((event: MouseEvent) => void) | undefined;
  } = $props();
  const resolvedResourceType = $derived(
    resourceType ?? determineResourceType(item.id)
  );

  function asNode(
    item: INodeThumb | ICollectionThumb | IGoalThumb
  ): INodeThumb {
    return item as INodeThumb;
  }

  function asCollection(
    item: INodeThumb | ICollectionThumb | IGoalThumb
  ): ICollectionThumb {
    return item as ICollectionThumb;
  }

  function asGoal(
    item: INodeThumb | ICollectionThumb | IGoalThumb
  ): IGoalThumb {
    return item as IGoalThumb;
  }

  function resolveSubType() {
    if (resolvedResourceType === Resource.node) {
      return asNode(item).contentType;
    }
    if (resolvedResourceType === Resource.collection) {
      return asCollection(item).type;
    }
    if (resolvedResourceType === Resource.goal) {
      return asGoal(item).type;
    }
    return undefined;
  }

  const subType = $derived(resolveSubType());

  function resolveSubTypeLabel(subType: string) {
    if (resolvedResourceType === Resource.node) {
      return resolveNodeContentLabel(subType as NodeType);
    } else if (resolvedResourceType === Resource.collection) {
      return (
        resolveCollectionTypeLabel(subType as CollectionType) + " collection"
      );
    } else if (resolvedResourceType === Resource.goal) {
      return resolveGoalTypeLabel(subType as GoalType) + " goal";
    } else return "";
  }
</script>

<button
  class={cn(
    "flex w-full gap-6 justify-between items-center px-1 cw:py-1 py-2 min-h-fit"
  )}
  onclick={(event) => {
    onClick?.(event);
  }}
  onmousedown={(event) => event.preventDefault()}
>
  <span
    class={cn("flex flex-col h-full truncate", {
      "w-full": isHideResourceType,
      "mo:w--4/5 w--3/4 min-w-0 flex-1": !isHideResourceType,
      "font--mono italic-":
        !isHideResourceType && resolvedResourceType === Resource.collection
    })}
  >
    {#if resolvedResourceType === Resource.node}
      <div class="flex gap-2 w-full truncate text-b2">
        <NodeTitleLabelPart
          item={asNode(item)}
          accessPoint={ResourceAccessPoint.SEARCH_RESULT}
        />
      </div>
      {#if asNode(item).bodySearch}
        <div
          class="text-left text-b2 text-fgs3 text-opacity-80 max-h-12 overflow-hidden"
        >
          {@html renderMdAsHtml(asNode(item).bodySearch ?? "")}
        </div>
      {/if}
    {:else if resolvedResourceType === Resource.collection}
      <CollectionTitleLabelPart item={asCollection(item)} isShowFallbackIcons={true} />
    {:else if resolvedResourceType === Resource.goal}
      <GoalSearchResultItem item={asGoal(item)} />
    {:else}
      <div class="flex text-left line-clamp-1 truncate">
        {isValidString(item.label) ? item.label : "Untitled"}
      </div>
    {/if}
  </span>
  {#if !isHideResourceType && (isValidString(subType) || isValidString(resolvedResourceType))}
    <span
      class="cw:text-b4 text-b3 text-fgs3 border border-brs2 rounded-md cw:px-1.5 px-2 py-0.5"
      >{properCase(subType ? resolveSubTypeLabel(subType) : resolvedResourceType)}</span
    >
  {/if}
</button>
