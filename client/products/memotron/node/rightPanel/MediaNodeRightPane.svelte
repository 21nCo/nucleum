<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
  import NodeRightPaneContent from "@21n/products/memotron/node/rightPanel/NodeRightPaneContent.svelte";
  import NodeDefaultRightPane from "./NodeDefaultRightPane.svelte";
  import { fly } from "svelte/transition";
  import { quadInOut } from "svelte/easing";
  export let node: IActiveNodeStore;
  export let renderingDetails: any = undefined;
  export let isConstrainedWidth: boolean = false;
  const typesWithLargerContent = [
    NodeType.PDF,
    NodeType.YOUTUBE_VIDEO,
    NodeType.VIDEO,
    NodeType.IMAGE,
    NodeType.AUDIO,
    NodeType.GIST,
    NodeType.WEB_SCREENSHOT,
    NodeType.WEB_VIDEO_BOOKMARK
  ];
  const panelsWithLargerContent = [
    ResourcePanelType.SIDENOTES,
    ResourcePanelType.LINKS,
    ResourcePanelType.ACTIVITY
  ];
  $: isExpanded =
    ((!$node.panel || $node.panel === ResourcePanelType.DEFAULT) &&
      !typesWithLargerContent.includes($node.contentType)) ||
    ($node.panel &&
      panelsWithLargerContent.includes($node.panel as ResourcePanelType));
</script>

<aside
  class={cn(
    "flex flex-col h-full gap-4 justify-center items-center mo:w-full cw:min-w-full min-w-96 w--80 2k:w--96 transition-all duration-300",
    {
      "w-3/10": !isExpanded,
      "w-2/3": isExpanded,
      "w-full px-3": isConstrainedWidth
    }
  )}
  in:fly={{ x: 100, duration: 300, easing: quadInOut }}
>
  {#if $node.panel && $node.panel !== ResourcePanelType.DEFAULT}
    <NodeRightPaneContent {node} {renderingDetails} />
  {:else}
    <NodeDefaultRightPane {node} />
  {/if}
</aside>
