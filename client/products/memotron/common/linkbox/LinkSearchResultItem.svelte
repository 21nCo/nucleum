<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  import NodeThumbnailTitle from "../../node/thumbnail/NodeThumbnailTitle.svelte";
  import NodeTitleBreadcrumbs from "../../node/title/NodeTitleBreadcrumbs.svelte";
  import { headingNodeTypes, NodeType, type INode } from "../../node/node.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import CollectionTitleLabelPart from "../../collection/title/CollectionTitleLabelPart.svelte";
  import type { ICollectionThumb } from "../../collection/collection.type";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  export let item: INode | ICollectionThumb;
  export let isHideResourceType: boolean = false;

  $: resourceType = determineResourceType(item.id);
</script>

<!-- TODO - improve search results - to show image preview, tweet preview, etc -->
<button
  class={cn("flex w-full justify-between items-center py-2 px-1 min-h-fit")}
  on:click
>
  <span
    class={cn("flex flex-col h-full", {
      "w-full": isHideResourceType,
      "mo:w-4/5 w-3/4": !isHideResourceType,
      italic: !isHideResourceType && resourceType === Resource.collection
    })}
  >
    {#if resourceType === Resource.node}
      <!-- TODO breadcrumbs - calling select for each result for parent resolution -->
      {#if headingNodeTypes.includes(item.contentType)}
        <NodeTitleBreadcrumbs id={item.id} on:click />
      {/if}
      <div class="flex gap-2 w-full">
        <NodeThumbnailTitle
          node={item}
          accessPoint={ResourceAccessPoint.SEARCH_RESULT}
        />
      </div>
      {#if item.bodySearch}
        <div class="text-left text-b2 text-fgs3">
          {@html renderMdAsHtml(item.bodySearch, {
            isIncludeSpaces: true
          })}
        </div>
      {/if}
    {:else if resourceType === Resource.collection}
      <CollectionTitleLabelPart {item} isShowFallbackIcons={true} />
    {/if}
  </span>
  {#if !isHideResourceType}
    <span class="text-b3 text-fgs3">{properCase(resourceType)}</span>
  {/if}
</button>
