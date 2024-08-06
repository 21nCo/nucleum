<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import ResourceThumbnailBase from "$lib/client/products/memotron/common/thumbnail/ResourceThumbnailBase.svelte";
  import ResourceThumbnailTitle from "$lib/client/products/memotron/common/thumbnail/ResourceThumbnailTitle.svelte";
  import type { INode } from "$lib/client/products/memotron/node/node.type";
  export let accessPointId: string;
  export let item: INode;
</script>

<!-- TODO - add parent breadcrumbs  and avatar in below component - moving from LinkSuggestionItem.svelte -->
<ResourceThumbnailBase
  {item}
  {accessPointId}
  accessPoint={ResourceAccessPoint.NODE_LINKS}
  on:action
>
  <button
    class={cn(
      "flex w-full p-3 border rounded-md truncate bg-bgs2 border-brs3 hover:border-aps2",
      {}
    )}
    on:click
  >
    <ResourceThumbnailTitle {item} />
  </button>
</ResourceThumbnailBase>
