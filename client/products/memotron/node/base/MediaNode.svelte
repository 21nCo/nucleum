<script lang="ts">
  import { type IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import MediaContent from "@21n/products/memotron/node/content/MediaContent.svelte";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { NodeView } from "@21n/products/memotron/node/node.type";
  import FullScreenCloseButton from "@21n/elements/button/FullScreenCloseButton.svelte";
  import NodeBirdView from "@21n/products/memotron/node/birdView/NodeBirdView.svelte";
  import MediaNodeCwTitlePanel from "../MediaNodeCwTitlePanel.svelte";
  export let node: IActiveNodeStore;
  export let nodeView: NodeView = NodeView.CONTENT;
  export let isConstrainedWidth: boolean = false;
</script>

{#if $node}
  <div class="relative flex flex-col cw:flex-col-reverse w-full h-full">
    {#if nodeView === NodeView.BIRD}
      <NodeBirdView {node} />
    {:else}
      <MediaContent {node} {isConstrainedWidth} />
    {/if}
    {#if isConstrainedWidth}
      <MediaNodeCwTitlePanel {node} />
    {/if}
    {#if ($node.accessMode === ResourceAccessMode.SPLIT || $node.accessMode === ResourceAccessMode.FSPLIT) && !$node.panel}
      <FullScreenCloseButton accessMode={$node.accessMode} isFloat={true} />
    {/if}
  </div>
{/if}
