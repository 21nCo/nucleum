<script lang="ts">
  import { type IActiveNodeStore } from "../node.store";
  import MediaContent from "../content/MediaContent.svelte";
  import MediaNodeFloatingBar from "../floatingBar/MediaNodeFloatingBar.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  export let node: IActiveNodeStore;
  export let accessMode: ResourceAccessMode;
  let isShowFloatingBar: boolean = true;
  let isHoveringOnFloatingBar: boolean = false;
  let timeoutId: any;
  function onInteraction(event: MouseEvent | TouchEvent | CustomEvent) {
    if (accessMode === ResourceAccessMode.POP) return;
    isShowFloatingBar = true;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (isHoveringOnFloatingBar) return;
      isShowFloatingBar = false;
    }, 1500);
  }
</script>

{#if $node}
  <main class="relative flex flex-col w-full h-full">
    <MediaContent {node} {accessMode} />
    {#if accessMode === ResourceAccessMode.POP || isShowFloatingBar || accessMode === ResourceAccessMode.INLINE}
      <MediaNodeFloatingBar
        bind:isHovering={isHoveringOnFloatingBar}
        {node}
        {accessMode}
        on:fullscreen={() => {
          appStore.toggleFocusAccessMode(accessMode, $node.id);
        }}
      />
    {/if}
  </main>
{/if}
<svelte:document on:mousemove={onInteraction} on:touchmove={onInteraction} />
