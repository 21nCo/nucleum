<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import CollectionThumbnail from "../collection/thumbnail/CollectionThumbnail.svelte";
  import { resolveResourceType } from "../memotron.utils";
  import NodeThumbnail from "../node/thumbnail/NodeThumbnail.svelte";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import { Size } from "$lib/client/types/size.enum";
  import {
    ResourceAccessPoint,
    ResourceAccessMode
  } from "$lib/client/components/resourceStores/resource.type";
  import { resolveMultiSelectStore } from "$lib/client/components/resourceStores/resource.store";
  export let data: any[] = [];
  export let resource: Resource = Resource.node;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let defaultAccessMode: ResourceAccessMode = ResourceAccessMode.POP;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  let parentBgIndex = 1;
  $: multiSelectContext = resource + "-" + accessPoint;
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);
  function onClick(e: MouseEvent, item: any) {
    multiSelectStore.clickHandler(e, item.id, {
      accessMode: defaultAccessMode
    });
    // if ($selectedResources.length > 0) {
    //   const isSelected = $selectedResources.includes(item.id);
    //   if (isSelected) {
    //     $selectedResources = $selectedResources.filter((x) => x != item.id);
    //     return;
    //   }
    //   $selectedResources = [...$selectedResources, item.id];
    //   return;
    // }
    // appStore.resourceClickHandler(e, item.id, defaultAccessMode);
  }
</script>

<div class="flex flex-col w-full h-full">
  <!-- <div class={cn("flex h-full w-full gap-4 flex-row flex-wrap content-start")}> -->
  <div
    class={cn(
      "h-full w-full gap-4 grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] content-start"
    )}
  >
    {#each data as item (item)}
      {#if resource === Resource.everything || resource === Resource.archived}
        {#if resolveResourceType(item) === MemotronResourceType.NODE}
          <NodeThumbnail
            {item}
            {accessPoint}
            {parentBgIndex}
            {arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else if item.id.startsWith("collection:")}
          <CollectionThumbnail
            {item}
            {size}
            {accessPoint}
            {arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else}
          <div
            class="h-72 w-80 border border-brs3 rounded-md hover:border-aps1 grow"
          >
            {item.label}
          </div>
        {/if}
      {:else if resource === Resource.node}
        <NodeThumbnail
          {item}
          {accessPoint}
          {parentBgIndex}
          {arrangement}
          on:click={(e) => onClick(e, item)}
        />
      {:else if resource === Resource.collection}
        <CollectionThumbnail
          {item}
          {size}
          {accessPoint}
          {arrangement}
          on:click={(e) => onClick(e, item)}
        />
      {/if}
    {/each}
  </div>
</div>
