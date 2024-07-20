<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import CollectionThumbnail from "../collection/thumbnail/CollectionThumbnail.svelte";
  import { resolveResourceType } from "../memotron.utils";
  import NodeThumbnail from "../node/nodeThumbnail/NodeThumbnail.svelte";
  export let data: any[] = [];
  export let selectedResource: string = "nodes";
  let arrangement: Arrangement = Arrangement.GRID;
  let parentBgIndex = 1;
</script>

<div class="flex flex-col w-full h-full">
  <!-- <div class={cn("flex h-full w-full gap-4 flex-row flex-wrap content-start")}> -->
  <div
    class={cn(
      "h-full w-full gap-4 grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] content-start"
    )}
  >
    {#each data as item}
      {#if selectedResource === "everything"}
        {#if resolveResourceType(item) === MemotronResourceType.NODE}
          <NodeThumbnail
            {item}
            {parentBgIndex}
            variant={arrangement}
            on:click={(e) =>
              appStore.resourceClickHandler(e, item.id, ResourceAccessMode.POP)}
          />
        {:else if item.id.startsWith("collection:")}
          <CollectionThumbnail
            {item}
            {arrangement}
            on:click={(e) =>
              appStore.resourceClickHandler(e, item.id, ResourceAccessMode.POP)}
          />
        {:else}
          <div
            class="h-72 w-80 border border-brs3 rounded-md hover:border-aps1 grow"
          >
            {item.label}
          </div>
        {/if}
      {:else if selectedResource === "nodes"}
        <NodeThumbnail
          {item}
          {parentBgIndex}
          variant={arrangement}
          on:click={(e) =>
            appStore.resourceClickHandler(e, item.id, ResourceAccessMode.POP)}
        />
      {:else if selectedResource === "collections"}
        <CollectionThumbnail
          {item}
          {arrangement}
          on:click={(e) =>
            appStore.resourceClickHandler(e, item.id, ResourceAccessMode.POP)}
        />
      {/if}
    {/each}
  </div>
</div>
