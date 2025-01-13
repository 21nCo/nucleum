<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  import NodeTitleBreadcrumbs from "$lib/client/products/memotron/node/title/NodeTitleBreadcrumbs.svelte";
  import {
    headingNodeTypes,
    NodeType,
    type INode
  } from "$lib/client/products/memotron/node/node.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import CollectionTitleLabelPart from "$lib/client/components/collection/thumbnail/CollectionThumbnailLabel.svelte";
  import type { ICollectionThumb } from "$lib/client/components/collection/collection.type";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import NodeTitleLabelPart from "$lib/client/products/memotron/node/title/NodeTitleLabelPart.svelte";
  export let item: INode | ICollectionThumb;
  export let isHideResourceType: boolean = false;

  $: resourceType = determineResourceType(item.id);
</script>

<!-- TODO - improve search results - to show image preview, tweet preview, etc -->
<button
  class={cn(
    "flex w-full gap-6 justify-between items-center px-1 py-2 min-h-fit"
  )}
  on:click
>
  <span
    class={cn("flex flex-col h-full", {
      "w-full": isHideResourceType,
      "mo:w--4/5 w--3/4 min-w-0 flex-1": !isHideResourceType,
      italic: !isHideResourceType && resourceType === Resource.collection
    })}
  >
    {#if resourceType === Resource.node}
      <!-- TODO need for breadcrumbs - Notes: Not required - as search results has heading as label directly for heading nodes & also below query is casuing heavy latency due to sub queries involved in breadcrumbs -->
      <!-- {#if headingNodeTypes.includes(item.contentType)}
        <NodeTitleBreadcrumbs id={item.id} on:click isSubtleContext={true} />
      {/if} -->
      <div class="flex gap-2 w-full truncate">
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
    {/if}
  </span>
  {#if !isHideResourceType}
    <span class="text-b3 text-fgs3 border border-brs2 rounded-md px-2 py-0.5"
      >{properCase(resourceType)}</span
    >
  {/if}
</button>
