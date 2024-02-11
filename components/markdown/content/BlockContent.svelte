<script lang="ts">
  import {
    MdBlockType,
    type BlockContent,
    BlockContext
  } from "$lib/tidy/types/md.type";
  import ListContent from "./ListContent.svelte";
  import TextContent from "./TextContent.svelte";
  export let mdId: string;
  export let content: BlockContent;
  export let id: string | undefined = undefined;
  export let parentHierarchy: string[] = [];
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  export let context: BlockContext = BlockContext.DEFAULT;
</script>

<div class="relative flex-grow w-full">
  {#if content.type === MdBlockType.DIVIDER}
    <div class="h-px bg-brs3 m-4"></div>
  {:else if content.type === MdBlockType.DOUBLE_DIVIDER}
    <div class="flex flex-col my-1 gap-0.5 mx-2">
      <div class="h-px bg-bgs4"></div>
      <div class="h-px bg-bgs4"></div>
    </div>
  {:else if content.type === MdBlockType.LIST}
    <ListContent
      {isHovering}
      {parentHierarchy}
      {content}
      {id}
      {mdId}
      bind:isFocusing
      on:blur
    />
  {:else if "body" in content}
    <TextContent
      {content}
      {id}
      {mdId}
      {context}
      {isHovering}
      bind:isFocusing
      on:insert
      on:blur
    />
  {/if}
</div>
