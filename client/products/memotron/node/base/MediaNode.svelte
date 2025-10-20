<script lang="ts">
  import { type IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import MediaContent from "@21n/products/memotron/node/content/MediaContent.svelte";
  import MediaNodeFloatingBar from "@21n/products/memotron/node/floatingBar/MediaNodeFloatingBar.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { NodeView, type NodeRightPaneType } from "@21n/products/memotron/node/node.type";
  import view from "@21n/stores/view.store";
  import FullScreenCloseButton from "@21n/elements/button/FullScreenCloseButton.svelte";
  import NodeBirdView from "@21n/products/memotron/node/birdView/NodeBirdView.svelte";
  import { resizeListener } from "@21n/actions/resize.action";
  export let node: IActiveNodeStore;
  export let nodeView: NodeView = NodeView.CONTENT;

  let isShowFloatingBar: boolean = true;
  let isHoveringOnFloatingBar: boolean = false;
  let timeoutId: any;
  let panelAction: NodeRightPaneType | undefined = undefined;
  let containerWidth = 0;
  $: isConstrainedWidth =
    containerWidth < 1000 ||
    $view.isConstrainedWidth ||
    $node.accessMode === ResourceAccessMode.SPLIT ||
    $node.accessMode === ResourceAccessMode.FSPLIT;

  function onInteraction(event: MouseEvent | TouchEvent | CustomEvent) {
    if ($node.accessMode !== ResourceAccessMode.SLIDESHOW) return;
    isShowFloatingBar = true;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (isHoveringOnFloatingBar) return;
      isShowFloatingBar = false;
    }, 1500);
  }
</script>

{#if $node}
  <div
    class="relative flex flex-col cw:flex-col-reverse cw:gap-8 w-full h-full"
    use:resizeListener={(e) => {
      containerWidth = e.width;
    }}
  >
    {#if nodeView === NodeView.BIRD}
      <NodeBirdView {node} bind:rightPane={panelAction} />
    {:else}
      <MediaContent {node} bind:rightPane={panelAction} {isConstrainedWidth} />
    {/if}
    {#if $node.accessMode !== ResourceAccessMode.SLIDESHOW || isShowFloatingBar}
      <MediaNodeFloatingBar
        bind:isHovering={isHoveringOnFloatingBar}
        {node}
        {isConstrainedWidth}
        bind:nodeView
        on:fullscreen={() => {
          appStore.toggleFullScreen($node.accessMode, $node.id);
        }}
        bind:bottomAction={panelAction}
      />
    {/if}
    {#if ($node.accessMode === ResourceAccessMode.SPLIT || $node.accessMode === ResourceAccessMode.FSPLIT) && !panelAction}
      <FullScreenCloseButton accessMode={$node.accessMode} isFloat={true} />
    {/if}
  </div>
{/if}
<svelte:document on:mousemove={onInteraction} on:touchmove={onInteraction} />
