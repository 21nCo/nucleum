<script lang="ts">
  import { type IActiveNodeStore } from "../node.store";
  import MediaContent from "../content/MediaContent.svelte";
  import MediaNodeFloatingBar from "../floatingBar/MediaNodeFloatingBar.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { NodeView, type NodeRightPaneType } from "../node.type";
  import view from "$lib/client/stores/view.store";
  import FullScreenCloseButton from "$lib/client/elements/button/FullScreenCloseButton.svelte";
  import NodeBirdView from "../birdView/NodeBirdView.svelte";
  export let node: IActiveNodeStore;

  let isShowFloatingBar: boolean = true;
  let isHoveringOnFloatingBar: boolean = false;
  let timeoutId: any;
  let panelAction: NodeRightPaneType | undefined = undefined;
  let nodeView: NodeView = NodeView.CONTENT;
  function onInteraction(event: MouseEvent | TouchEvent | CustomEvent) {
    if ($node.accessMode !== ResourceAccessMode.SLIDESHOW) return;
    isShowFloatingBar = true;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (isHoveringOnFloatingBar) return;
      isShowFloatingBar = false;
    }, 1500);
  }
  function onBirdViewToggle(e: CustomEvent) {
    nodeView = e.detail ? NodeView.BIRD_VIEW : NodeView.CONTENT;
  }
</script>

{#if $node}
  <div class="relative flex flex-col w-full h-full">
    {#if nodeView === NodeView.BIRD_VIEW}
      <NodeBirdView {node} bind:rightPane={panelAction} />
    {:else}
      <MediaContent {node} bind:rightPane={panelAction} />
    {/if}
    {#if $node.accessMode !== ResourceAccessMode.SLIDESHOW || isShowFloatingBar}
      <MediaNodeFloatingBar
        bind:isHovering={isHoveringOnFloatingBar}
        {node}
        bind:nodeView
        on:fullscreen={() => {
          appStore.toggleFullScreen($node.accessMode, $node.id);
        }}
        on:birdView={onBirdViewToggle}
        bind:bottomAction={panelAction}
      />
    {/if}
    {#if ($view.isConstrainedWidth || $node.accessMode === ResourceAccessMode.SPLIT || $node.accessMode === ResourceAccessMode.FSPLIT) && !panelAction}
      <FullScreenCloseButton accessMode={$node.accessMode} isFloat={true} />
    {/if}
  </div>
{/if}
<svelte:document on:mousemove={onInteraction} on:touchmove={onInteraction} />
