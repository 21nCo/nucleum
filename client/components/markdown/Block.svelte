<script lang="ts">
  import type {
    IBlock,
    IMarkdownStore
  } from "$lib/client/components/markdown/md.type";
  import { getContext, onMount } from "svelte";
  import BlockContent from "./content/BlockContent.svelte";
  import LeftControls from "./LeftControls.svelte";
  import type { MdStoreType } from "./markdown.store";
  import {
    type StructuralNodeType,
    structuralNodeTypes
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { setContext } from "svelte";
  import { logger } from "../debug/logger.client";

  export let block: IBlock;
  export let mdStore: MdStoreType;
  let isHovering: boolean = false;
  let isFocusing: boolean = false;
  let isReRendering: boolean = false;
  let isShowBgOnFocus: boolean = false;
  // const mdStore = getMdStore(mdId);

  const markdownContext = getContext<any>("markdown");

  function propagate(event: string, data: any) {
    markdownContext({
      event,
      data: {
        ...data,
        source: block.id
      }
    });
  }

  function blockContextEventListener(event: string, data: any) {
    logger.log({ at: "blockContextEventListener", event, data });
    if (!event) return;
    if (event === "convert") {
      const fromType = block.contentType;
      block.contentType = data.toType;
      if (data.params?.listType) block.listType = data.params?.listType;
      propagate(event, { ...data, fromType });
    } else if (event === "delete") {
      mdStore.deleteBlock(block.id);
      propagate(event, {});
    } else if (event === "insert") {
      let newBlockId;
      if (data?.blockType && structuralNodeTypes.includes(data.blockType)) {
        newBlockId = mdStore.insertStructualBlock(
          block.id,
          data.blockType as StructuralNodeType
        );
      } else newBlockId = mdStore.insert({ source: block.id, ...data });
      propagate(event, { ...data, id: newBlockId });
    } else {
      propagate(event, data);
    }
  }
  const blockContext = {
    publish: blockContextEventListener
  };
  setContext("block", blockContext);

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
