<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import CollectionThumbnail from "../collection/thumbnail/CollectionThumbnail.svelte";
  import NodeThumbnail from "../node/thumbnail/NodeThumbnail.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { Size } from "$lib/client/types/size.enum";
  import {
    ResourceAccessPoint,
    ResourceAccessMode,
    ResourceAccessPointState
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import { appStore } from "$lib/client/stores/app.store";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import { createEventDispatcher } from "svelte";
  import type { INodeThumb } from "../node/node.type";
  import type { ICollection } from "../collection/collection.type";
  import type { IFile } from "$lib/client/components/files/file.type";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import NodeItems from "../collection/NodeItems.svelte";
  import LibraryLoadingPulse from "../library/LibraryLoadingPulse.svelte";
  const dispatch = createEventDispatcher();
  export let data: (INodeThumb | ICollection | IFile)[] = [];
  export let resource: Resource = Resource.node;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let defaultAccessMode: ResourceAccessMode = ResourceAccessMode.POP;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointState: ResourceAccessPointState =
    ResourceAccessPointState.DEFAULT;
  export let isPreventDefault = false;
  export let width: number = 290;
  export let isShowLoadingPulseAtTheEnd: boolean = false;
  let parentBgIndex = 1;
  $: multiSelectContext = {
    resource,
    accessPoint
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);
  function onClick(e: MouseEvent, item: any) {
    if (isPreventDefault) {
      dispatch("click", item);
      return;
    }
    const result = multiSelectStore.clickHandler(item.id);
    if (!result)
      appStore.resourceClickHandler(e, item.id, {
        defaultTo: defaultAccessMode
      });
  }
</script>

<div class="flex flex-col w-full h-full">
  <!-- <div class={cn("flex h-full w-full gap-4 flex-row flex-wrap content-start")}> -->
  {#if resource === Resource.node && arrangement === Arrangement.MASONRY}
    <NodeItems nodes={data} {arrangement} density={3} {accessPoint} />
  {:else}
    <div
      class={cn(
        `h-full w-full gap-4 grid grid-cols-[repeat(auto-fill,minmax(${width}px,1fr))] content-start`
      )}
    >
      {#each data as item (item)}
        {#if resource === Resource.everything}
          {@const resourceType = determineResourceType(item.id)}
          {#if resourceType === Resource.node}
            <NodeThumbnail
              {item}
              {accessPoint}
              {parentBgIndex}
              {arrangement}
              on:click={(e) => onClick(e, item)}
            />
          {:else if resourceType === Resource.collection}
            <CollectionThumbnail
              {item}
              {size}
              {accessPoint}
              {accessPointState}
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
        {:else if resource === Resource.node && arrangement !== Arrangement.MASONRY}
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
            {accessPointState}
            {arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else if resource === Resource.file}
          <button class="h-40" on:click={(e) => onClick(e, item)}>
            <FileView
              id={item.id}
              isLazyLoad={true}
              class={cn("h-full w-full rounded-md object-cover", {})}
            />
          </button>
        {/if}
      {/each}
      {#if isShowLoadingPulseAtTheEnd}
        <LibraryLoadingPulse {resource} isTail={true} />
      {/if}
    </div>
  {/if}
</div>
