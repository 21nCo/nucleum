<script lang="ts">
  import { BlockContext, type Block } from "$lib/client/types/memotron/md.type";
  import {
    NodeType,
    TextNodeTypeList
  } from "$lib/client/types/memotron/node.type";
  import type { MdStoreType } from "../markdown.store";
  import ListContent from "./ListContent.svelte";
  import TextContent from "./TextContent.svelte";
  export let mdStore: MdStoreType;
  export let block: Block;
  export let parentHierarchy: string[] = [];
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  export let context: BlockContext = BlockContext.DEFAULT;
</script>

<div class="relative flex-grow w-full">
  {#if block.contentType === NodeType.DIVIDER}
    <div class="h-px bg-brs3 m-4"></div>
  {:else if block.contentType === NodeType.DOUBLE_DIVIDER}
    <div class="flex flex-col my-1 gap-0.5 mx-2">
      <div class="h-px bg-bgs4"></div>
      <div class="h-px bg-bgs4"></div>
    </div>
  {:else if block.contentType === NodeType.LIST}
    <ListContent
      {block}
      {isHovering}
      {parentHierarchy}
      {mdStore}
      bind:isFocusing
      on:blur
      on:change
      on:insert
      on:convert
      on:delete
    />
  {:else if TextNodeTypeList.includes(block.contentType) && "body" in block}
    <TextContent
      {block}
      {mdStore}
      {context}
      {isHovering}
      bind:isFocusing
      on:insert
      on:convert
      on:delete
      on:blur
      on:change
    />
  {/if}
</div>
