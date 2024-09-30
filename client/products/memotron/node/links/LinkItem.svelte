<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import ResourceThumbnailBase from "$lib/client/products/memotron/common/thumbnail/ResourceThumbnailBase.svelte";
  import type {
    INode,
    INodeLinkThumb
  } from "$lib/client/products/memotron/node/node.type";
  import NodeThumbnailTitle from "../thumbnail/NodeThumbnailTitle.svelte";
  import NodeThumbnailContentType from "../thumbnail/NodeThumbnailContentType.svelte";
  import NodeThumbnailWebLink from "../thumbnail/NodeThumbnailWebLink.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import LinkTagger from "../../linking/LinkTagger.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import ResourceThumbnailContextMenu from "../../common/thumbnail/ResourceThumbnailContextMenu.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import LinkTags from "../../linking/LinkTags.svelte";
  export let accessPointId: IRecordId;
  export let link: INodeLinkThumb;
  export let item: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.NODE_LINKS;
  let isHovering = false;
  let isShowLinkTagger = false;
</script>

<!-- TODO - add parent breadcrumbs  and avatar in below component - moving from LinkSuggestionItem.svelte -->

<button
  class={cn(
    "flex flex-col gap-2 w-full px-3 py-2 border rounded-md truncate bg--bgs2 border-brs3 hover:border-fgs4",
    {}
  )}
  on:click
  use:hoverable
  on:hover={(e) => (isHovering = e.detail)}
>
  <div class="flex items-center justify-between w-full">
    <div class="flex-1 min-w-0">
      <NodeThumbnailTitle node={item} />
    </div>
    <button class="flex gap-2" on:click={(e) => e.stopPropagation()}>
      {#if isHovering}
        <Toggle icon="ph:tag-thin" bind:on={isShowLinkTagger} />
      {/if}
      <ResourceThumbnailContextMenu {item} {accessPoint} {accessPointId} />
    </button>
  </div>
  <!-- <div class="flex gap-2 w-full">
      <NodeThumbnailContentType {item} />
      {#if isHovering}
        <NodeThumbnailWebLink {item} />
      {/if}
    </div> -->
  {#if link.tags && link.tags.length > 0}
    <LinkTags bind:link on:tagClick />
  {/if}
  {#if isShowLinkTagger}
    <div class="w-full">
      <LinkTagger bind:link />
    </div>
  {/if}
</button>
