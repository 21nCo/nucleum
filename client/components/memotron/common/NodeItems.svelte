<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  import {
    type INodeThumbnail,
    NodeThumbnailVariant
  } from "$lib/client/types/memotron/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { resourceClickHandler } from "$lib/client/utils/utils";
  import NodeThumbnail from "./nodeThumbnail/NodeThumbnail.svelte";
  export let nodes: INodeThumbnail[] = [];
  export let arrangement: NodeThumbnailVariant = NodeThumbnailVariant.LIST;
  export let parentBgIndex = 1;
</script>

<div class="flex flex-col w-full h-full">
  <div
    class={cn("flex h-full w-full gap-4", {
      "flex-col justify-start":
        arrangement === NodeThumbnailVariant.LIST ||
        arrangement === NodeThumbnailVariant.TIMELINE,
      "flex-row flex-wrap content-start":
        arrangement === NodeThumbnailVariant.GRID
    })}
  >
    {#each nodes as item}
      <NodeThumbnail
        node={item}
        {parentBgIndex}
        variant={arrangement}
        on:click={(e) =>
          resourceClickHandler(e, item.id, ResourceAccessMode.POP)}
      />
    {/each}
  </div>
  <ScrollViewBottomSpacer />
</div>
