<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import CollectionThumbnail from "../collection/thumbnail/CollectionThumbnail.svelte";
  import { resolveResourceType } from "../memotron.utils";
  import NodeThumbnail from "../node/nodeThumbnail/NodeThumbnail.svelte";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  export let data: any[] = [];
  export let resource: Resource = Resource.node;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let defaultAccessMode: ResourceAccessMode = ResourceAccessMode.POP;
  let parentBgIndex = 1;
  function onClick(e: MouseEvent, item: any) {
    appStore.resourceClickHandler(e, item.id, defaultAccessMode);
  }
</script>

<div class="flex flex-col w-full h-full">
  <!-- <div class={cn("flex h-full w-full gap-4 flex-row flex-wrap content-start")}> -->
  <div
    class={cn(
      "h-full w-full gap-4 grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] content-start"
    )}
  >
    {#each data as item}
      {#if resource === "everything"}
        {#if resolveResourceType(item) === MemotronResourceType.NODE}
          <NodeThumbnail
            {item}
            {parentBgIndex}
            variant={arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else if item.id.startsWith("collection:")}
          <CollectionThumbnail
            {item}
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
          {parentBgIndex}
          variant={arrangement}
          on:click={(e) => onClick(e, item)}
        />
      {:else if resource === Resource.collection}
        <CollectionThumbnail
          {item}
          {arrangement}
          on:click={(e) => onClick(e, item)}
        />
      {/if}
    {/each}
  </div>
</div>
