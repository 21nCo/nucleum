<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { appStore } from "@21n/stores/app.store";
  import type { IRecordId } from "@21n/types/data.type";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import NodeThumbnail from "@21n/products/memotron/node/thumbnail/NodeThumbnail.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import type { INodeThumb } from "@21n/products/memotron/node/node.type";

  interface MapItemData {
    id: string;
    label: string;
    contentType: string;
    createdAt: string;
    url?: string;
    metadata?: any;
  }

  export let data: MapItemData;
  let resourceType = determineResourceType(data.id);
  let nodeItem: INodeThumb;
  $: resourceType = determineResourceType(data.id);
  $: nodeItem = data as unknown as INodeThumb;

  const dispatch = createEventDispatcher();

  function handleClick(event: MouseEvent) {
    const id: IRecordId = data.id;
    appStore.resourceClickHandler(event, id);
    dispatch("resourceOpened", { id });
  }
</script>

{#if resourceType === Resource.node}
  <NodeThumbnail
    item={nodeItem}
    on:click={handleClick}
    accessPoint={ResourceAccessPoint.MAP}
    accessPointId={data.id}
  />
{:else}
  <div
    class="map-item-container bg-bgs1 border border-brs2 rounded-md p-3 cursor-pointer hover:bg-bgs2 transition-colors"
    on:click={handleClick}
    on:keydown
    role="button"
    tabindex="0"
  >
    <div class="flex flex-col gap-2">
      <h3 class="text-b2 font-medium text-fgs1 truncate">
        {data.label || "Untitled"}
      </h3>
      <p class="text-b3 text-fgs3">{data.contentType || ""}</p>
      <p class="text-b4 text-fgs4">
        {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : ""}
      </p>
    </div>
  </div>
{/if}

<style>
  .map-item-container {
    width: 280px;
    max-width: 280px;
  }
</style>
