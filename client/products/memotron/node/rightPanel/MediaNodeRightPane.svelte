<script lang="ts">
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import view from "@21n/stores/view.store";
  import { cn } from "@21n/utils/ui.utils";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import {
    NodeRightPaneType,
    NodeType
  } from "@21n/products/memotron/node/node.type";
  import NodeRightPaneContent from "@21n/products/memotron/node/rightPanel/NodeRightPaneContent.svelte";
  import WebpageNodeDefaultRightPane from "@21n/products/memotron/node/rightPanel/WebNodeDefaultRightPane.svelte";
  export let node: IActiveNodeStore;
  export let pane: NodeRightPaneType | undefined = undefined;
  export let renderingDetails: any = undefined;
  export let isConstrainedWidth: boolean = false;
  const typesWithMinimalRightPanel = [NodeType.PDF, NodeType.YOUTUBE_VIDEO];
  $: isExpanded =
    ((!pane || pane === NodeRightPaneType.DEFAULT) &&
      !typesWithMinimalRightPanel.includes($node.contentType)) ||
    pane === NodeRightPaneType.SIDENOTES;
</script>

<aside
  class={cn(
    "flex flex-col h-full gap-4 justify-center items-center mo:w-full cw:min-w-full min-w-96 w--80 2k:w--96",
    {
      "w-3/10": !isExpanded,
      "w-1/2": isExpanded,
      "w-full px-3": isConstrainedWidth
    }
  )}
>
  {#if pane}
    <NodeRightPaneContent
      {node}
      {pane}
      {renderingDetails}
      {isConstrainedWidth}
      on:close={() => {
        pane = undefined;
      }}
    />
  {:else}
    <WebpageNodeDefaultRightPane {node} bind:pane />
  {/if}
</aside>
