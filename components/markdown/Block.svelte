<script lang="ts">
  import { MdContext, type Block } from "$lib/tidy/types/md.type";
  import BlockContent from "./content/BlockContent.svelte";
  import LeftControls from "./LeftControls.svelte";
  import { getMdStore } from "./markdown.store";
  export let block: Block;
  export let mdId: string;
  let isHovering: boolean = false;
  let isFocusing: boolean = false;
  const mdStore = getMdStore(mdId);
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
    {#if $mdStore.context === MdContext.NODE && (isHovering || isFocusing)}
      <LeftControls />
    {/if}
  </div>
  <div
    id="sss"
    class="-ml-10 pl-10 flex grow rounded-md {isHovering || isFocusing
      ? 'bg-bgs2-disabled'
      : ''}"
  >
    <BlockContent
      content={block.content}
      id={block.id}
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
