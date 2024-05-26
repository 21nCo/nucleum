<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/elements/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { MemotronEvent } from "$lib/client/types/memotron/memotronEvent.enum";
  import {
    type INodeThumbnail,
    NodeThumbnailVariant
  } from "$lib/client/types/memotron/node.type";
  import { toggleSearchParam } from "$lib/client/utils/browser.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeThumbnail from "./nodeThumbnail/NodeThumbnail.svelte";
  export let nodes: INodeThumbnail[] = [];
  export let arrangement: NodeThumbnailVariant = NodeThumbnailVariant.LIST;
  export let parentBgIndex = 1;
</script>

<div
  class={cn("flex h-full w-full gap-4 overflow-auto", {
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
      on:click={() => {
        toggleSearchParam("node", item.id);
        appStore.runAction(MemotronEvent.JOURNAL_MODAL_VIEWER);
      }}
    />
  {/each}
  <ScrollViewBottomSpacer />
</div>
