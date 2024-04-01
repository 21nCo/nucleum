<script lang="ts">
  import type { Block, MdStore } from "$lib/tidy/types/md.type";
  import { onMount } from "svelte";
  import BlockContent from "./content/BlockContent.svelte";
  import LeftControls from "./LeftControls.svelte";
  import { getMdStore } from "./markdown.store";
  export let block: Block;
  export let mdId: string;
  let isHovering: boolean = false;
  let isFocusing: boolean = false;
  let isReRendering: boolean = false;
  let isShowBgOnFocus: boolean = false;
  const mdStore = getMdStore(mdId);
  onMount(() => {
    //TODO - check the need for rerendering
    const mdStoreSub = mdStore.subscribe((md: MdStore) => {
      // console.log("re-render block", md.reRenderBlock);
      if (md.reRenderBlock === block.id) {
        // console.log("re-rendering block", block.id);
        isReRendering = true;
        setTimeout(() => {
          isReRendering = false;
        }, 0.1);
      }
    });
    return () => {
      mdStoreSub();
    };
  });
</script>

<div
  class="relative flex items-start w-full"
  on:pointerenter={() => {
    isHovering = true;
  }}
  on:pointerleave={() => {
    isHovering = false;
  }}
>
  <div class="absolute -left-10 flex h-full justify-center">
    {#if isHovering || isFocusing}
      <LeftControls {mdId} />
    {/if}
  </div>
  <div
    id="sss"
    class="-ml-10 pl-10 flex grow rounded-md {(isHovering || isFocusing) &&
    isShowBgOnFocus &&
    !$mdStore.params?.isReadOnly
      ? 'bg-bgs2'
      : ''}"
  >
    <BlockContent
      {block}
      {mdId}
      {isHovering}
      bind:isFocusing
      on:blur={() => {
        isHovering = false;
      }}
    />
  </div>
</div>

<!-- <style>
  #sss:hover::before {
    content: "sss";
    width: 2rem;
  }
  #sss:before {
    content: "";
    width: 2rem;
  }
</style> -->
