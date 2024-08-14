<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import ResourceThumbnailBase from "$lib/client/products/memotron/common/thumbnail/ResourceThumbnailBase.svelte";
  import type { INode } from "$lib/client/products/memotron/node/node.type";
  import NodeThumbnailTitle from "../thumbnail/NodeThumbnailTitle.svelte";
  import NodeThumbnailContentType from "../thumbnail/NodeThumbnailContentType.svelte";
  import NodeThumbnailWebLink from "../thumbnail/NodeThumbnailWebLink.svelte";
  export let accessPointId: string;
  export let item: INode;
  let isHovering = false;
</script>

<!-- TODO - add parent breadcrumbs  and avatar in below component - moving from LinkSuggestionItem.svelte -->
<ResourceThumbnailBase
  {item}
  {accessPointId}
  bind:isHovering
  accessPoint={ResourceAccessPoint.NODE_LINKS}
  on:action
>
  <button
    class={cn(
      "flex flex-col gap-2 w-full p-3 border rounded-md truncate bg-bgs2 border-brs3 hover:border-aps2",
      {}
    )}
    on:click
  >
    <NodeThumbnailTitle node={item} />
    <div class="flex gap-2 w-full">
      <NodeThumbnailContentType {item} />
      {#if isHovering}
        <NodeThumbnailWebLink {item} />
      {/if}
    </div>
  </button>
</ResourceThumbnailBase>
