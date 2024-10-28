<script lang="ts">
  import {
    BlockContext,
    type IBlock
  } from "$lib/client/components/markdown/md.type";
  import {
    NodeType,
    TextNodeTypeList
  } from "$lib/client/products/memotron/node/node.type";
  import EmbedContent from "../embed/EmbedContent.svelte";
  import type { MdStoreType } from "../markdown.store";
  import MediaGrid from "../mediaGrid/MediaGrid.svelte";
  import Callout from "./Callout.svelte";
  import ListContent from "./ListContent.svelte";
  import TextContent from "./TextContent.svelte";
  export let mdStore: MdStoreType;
  export let block: IBlock;
  export let parentHierarchy: string[] = [];
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  export let context: BlockContext = BlockContext.DEFAULT;
</script>

<div class="relative flex-grow w-full">
  {#if block.contentType === NodeType.DIVIDER}
    <div class="h-px bg-brs3 my-4"></div>
  {:else if block.contentType === NodeType.DOUBLE_DIVIDER}
    <div class="flex flex-col my-1 gap-0.5">
      <div class="h-px bg-bgs4"></div>
      <div class="h-px bg-bgs4"></div>
    </div>
  {:else if block.contentType === NodeType.MEDIA_GRID}
    <MediaGrid {block} {mdStore} on:delete />
  {:else if block.contentType === NodeType.EMBED}
    <EmbedContent {block} {mdStore} />
  {:else if block.contentType === NodeType.CALLOUT}
    <Callout {block} {mdStore} />
  {:else if block.contentType === NodeType.LIST}
    <ListContent
      {block}
      {isHovering}
      {parentHierarchy}
      {mdStore}
      bind:isFocusing
      on:blur
    />
  {:else if TextNodeTypeList.includes(block.contentType) && "body" in block}
    <TextContent
      {block}
      {mdStore}
      {context}
      {isHovering}
      bind:isFocusing
      on:blur
    />
  {/if}
</div>
