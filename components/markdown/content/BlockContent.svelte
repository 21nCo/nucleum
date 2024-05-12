<script lang="ts">
  import { BlockContext, type Block } from "$lib/tidy/types/md.type";
  import { NodeType, TextNodeTypeList } from "$lib/tidy/types/node.type";
  import ListContent from "./ListContent.svelte";
  import TextContent from "./TextContent.svelte";
  export let mdId: string;
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
      {mdId}
      bind:isFocusing
      on:blur
    />
  {:else if TextNodeTypeList.includes(block.contentType) && "body" in block}
    <TextContent
      {block}
      {mdId}
      {context}
      {isHovering}
      bind:isFocusing
      on:insert
      on:blur
    />
  {/if}
</div>
