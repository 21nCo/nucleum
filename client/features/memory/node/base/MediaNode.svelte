<script lang="ts">
  import { type IActiveNodeStore } from "@nucleum/features/memory/node/node.store";
  import MediaContent from "@nucleum/features/memory/node/content/MediaContent.svelte";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { NodeView } from "@nucleum/features/memory/node/node.type";
  import FullScreenCloseButton from "@nucleum/shell/navigation/components/FullScreenCloseButton.svelte";
  import NodeBirdView from "@nucleum/features/memory/node/birdView/NodeBirdView.svelte";
  import MediaNodeCwTitlePanel from "../MediaNodeCwTitlePanel.svelte";
  let {
    node,
    accessMode = undefined,
    nodeView = NodeView.CONTENT,
    isConstrainedWidth = false
  }: {
    node: IActiveNodeStore;
    /** Mode this view of the node is open in; views share one store. */
    accessMode?: AccessMode;
    nodeView?: NodeView;
    isConstrainedWidth?: boolean;
  } = $props();
</script>

{#if $node}
  <div class="relative flex flex-col cw:flex-col-reverse w-full h-full">
    {#if nodeView === NodeView.BIRD}
      <NodeBirdView {node} />
    {:else}
      <MediaContent {node} {accessMode} {isConstrainedWidth} />
    {/if}
    {#if isConstrainedWidth}
      <MediaNodeCwTitlePanel {node} {accessMode} />
    {/if}
    {#if ($node.accessMode === AccessMode.BESIDE_BASE || $node.accessMode === AccessMode.BESIDE_PAGE) && !$node.panel}
      <FullScreenCloseButton accessMode={$node.accessMode} isFloat={true} />
    {/if}
  </div>
{/if}
