<script lang="ts">
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IActiveNodeStore } from "../node.store";
  import { NodeRightPaneType } from "../node.type";
  import NodeRightPaneContent from "./NodeRightPaneContent.svelte";
  import WebpageNodeDefaultRightPane from "./WebNodeDefaultRightPane.svelte";
  export let node: IActiveNodeStore;
  export let pane: NodeRightPaneType | undefined = undefined;
  export let renderingDetails: any = undefined;
  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    $node.accessMode === ResourceAccessMode.SPLIT ||
    $node.accessMode === ResourceAccessMode.FSPLIT;
</script>

<aside
  class={cn(
    "flex flex-col h-full gap-4 justify-center items-center mo:w-full min-w-96 w-3/10 w--80 2k:w--96",
    {
      "w-full": isConstrainedWidth
    }
  )}
>
  {#if pane}
    <NodeRightPaneContent
      {node}
      {pane}
      {renderingDetails}
      on:close={() => {
        pane = undefined;
      }}
    />
  {:else}
    <WebpageNodeDefaultRightPane {node} bind:pane />
  {/if}
</aside>
