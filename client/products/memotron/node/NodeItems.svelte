<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { type INodeThumbnail } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeThumbnail from "./thumbnail/NodeThumbnail.svelte";
  export let nodes: INodeThumbnail[] = [];
  export let arrangement: Arrangement = Arrangement.LIST;
  export let parentBgIndex = 1;
</script>

<div class="flex flex-col w-full h-full">
  <div
    class={cn("flex h-full w-full gap-4", {
      "flex-col justify-start":
        arrangement === Arrangement.LIST ||
        arrangement === Arrangement.TIMELINE,
      "flex-row flex-wrap content-start": arrangement === Arrangement.GRID
    })}
  >
    {#each nodes as item}
      <NodeThumbnail
        {item}
        {parentBgIndex}
        variant={arrangement}
        on:click={(e) =>
          appStore.resourceClickHandler(e, item.id, ResourceAccessMode.POP)}
      />
    {/each}
  </div>
  <ScrollViewBottomSpacer />
</div>
