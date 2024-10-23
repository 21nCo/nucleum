<script lang="ts">
  import type { IActiveNodeStore } from "../node.store";
  import { NodeRightPaneType } from "../node.type";
  import NodeRightPaneContent from "./NodeRightPaneContent.svelte";
  import WebpageNodeDefaultRightPane from "./WebNodeDefaultRightPane.svelte";
  export let node: IActiveNodeStore;
  export let pane: NodeRightPaneType | undefined = undefined;
  export let renderingDetails: any = undefined;
</script>

<aside
  class="flex flex-col h-full gap-4 justify-center items-center mo:w-full min-w-96 w-3/10 w--80 2k:w--96"
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
