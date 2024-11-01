<script lang="ts">
  import { type IActiveNodeStore } from "../node.store";
  import MediaContent from "../content/MediaContent.svelte";
  import MediaNodeFloatingBar from "../floatingBar/MediaNodeFloatingBar.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { NodeRightPaneType } from "../node.type";
  import view from "$lib/client/stores/view.store";
  import FullScreenCloseButton from "$lib/client/elements/button/FullScreenCloseButton.svelte";
  import NodeBirdView from "../birdView/NodeBirdView.svelte";
  export let node: IActiveNodeStore;

  let isShowFloatingBar: boolean = true;
  let isHoveringOnFloatingBar: boolean = false;
  let timeoutId: any;
  let panelAction: NodeRightPaneType | "birdView" | undefined = undefined;

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
  <div class="relative flex flex-col w-full h-full">
    {#if panelAction === "birdView"}
      <NodeBirdView {node} isMediaNode={true} />
    {:else}
      <MediaContent {node} bind:rightPane={panelAction} />
    {/if}
    {#if $node.accessMode !== ResourceAccessMode.SLIDESHOW || isShowFloatingBar}
      <MediaNodeFloatingBar
        bind:isHovering={isHoveringOnFloatingBar}
        {node}
        on:fullscreen={() => {
          appStore.toggleFocusAccessMode($node.accessMode, $node.id);
        }}
        bind:bottomAction={panelAction}
      />
    {/if}
  </div>
{/if}
<svelte:document on:mousemove={onInteraction} on:touchmove={onInteraction} />
{#if $view.isConstrainedWidth && !panelAction}
  <FullScreenCloseButton accessMode={$node.accessMode} isFloat={true} />
{/if}
