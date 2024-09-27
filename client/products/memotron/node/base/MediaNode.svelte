<script lang="ts">
  import { type IActiveNodeStore } from "../node.store";
  import MediaContent from "../content/MediaContent.svelte";
  import MediaNodeFloatingBar from "../floatingBar/MediaNodeFloatingBar.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { NodeRightPaneType } from "../node.type";

  export let node: IActiveNodeStore;

  let isShowFloatingBar: boolean = true;
  let isHoveringOnFloatingBar: boolean = false;
  let timeoutId: any;
  let rightPane: NodeRightPaneType | undefined = undefined;

  function onInteraction(event: MouseEvent | TouchEvent | CustomEvent) {
    if ($node.accessMode === ResourceAccessMode.POP) return;
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
    <MediaContent {node} bind:rightPane />
    {#if $node.accessMode === ResourceAccessMode.POP || isShowFloatingBar || $node.accessMode === ResourceAccessMode.INLINE}
      <MediaNodeFloatingBar
        bind:isHovering={isHoveringOnFloatingBar}
        {node}
        on:fullscreen={() => {
          appStore.toggleFocusAccessMode($node.accessMode, $node.id);
        }}
        bind:rightPane
      />
    {/if}
  </div>
{/if}
<svelte:document on:mousemove={onInteraction} on:touchmove={onInteraction} />
