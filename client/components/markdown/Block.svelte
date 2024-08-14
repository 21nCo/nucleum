<script lang="ts">
  import type {
    IBlock,
    IMarkdownStore
  } from "$lib/client/components/markdown/md.type";
  import { createEventDispatcher, onMount } from "svelte";
  import BlockContent from "./content/BlockContent.svelte";
  import LeftControls from "./LeftControls.svelte";
  import type { MdStoreType } from "./markdown.store";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  const dispatch = createEventDispatcher();
  export let block: IBlock;
  export let mdStore: MdStoreType;
  let isHovering: boolean = false;
  let isFocusing: boolean = false;
  let isReRendering: boolean = false;
  let isShowBgOnFocus: boolean = false;
  // const mdStore = getMdStore(mdId);
  onMount(() => {
    //TODO - check the need for rerendering
    const mdStoreSub = mdStore.subscribe((md: IMarkdownStore) => {
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
  class="flex w-full items-center gap-2 rounded-md {isHovering &&
  isShowBgOnFocus &&
  $mdStore.params?.isNodular &&
  !$mdStore.params?.isReadOnly
    ? 'bg-bgs2'
    : ''}"
  data-content={block.contentType}
  data-node={block.id}
  on:pointerenter={() => {
    isHovering = true;
  }}
  on:pointerleave={() => {
    isHovering = false;
  }}
>
  {#if $mdStore.params?.isNodular && !$mdStore.params?.isReadOnly}
    <div
      class={cn("opacity-0 w-12 min-w-[3rem] flex h-full", {
        "opacity-100": (isHovering || isFocusing) && $mdStore.params?.isNodular
      })}
    >
      <LeftControls {mdStore} {block} on:focus />
    </div>
  {/if}
  <div class="grow">
    <BlockContent
      {block}
      {mdStore}
      {isHovering}
      bind:isFocusing
      on:change
      on:insert
      on:convert
      on:delete
      on:mention
      on:unmention
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
