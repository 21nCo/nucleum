<script lang="ts">
  import type { IBlock } from "$lib/client/components/markdown/md.type";
  import {
    headingNodeTypes,
    listNodeTypes,
    NodeType,
    simpleTextNodeTypeList
  } from "$lib/client/products/memotron/node/node.type";
  import EmbedContent from "../embed/EmbedContent.svelte";
  import type { MdStoreType } from "../markdown.store";
  import MediaGrid from "../mediaGrid/MediaGrid.svelte";
  import Callout from "../callout/Callout.svelte";
  import TextContent from "./TextContent.svelte";
  import CodeContent from "./CodeContent.svelte";
  import ListContent from "../lists/ListContent.svelte";
  import HeadingContent from "./HeadingContent.svelte";
  export let mdStore: MdStoreType;
  export let block: IBlock;
  /**
   * @deprecated - used with ListContent v1 approach
   */
  export let parentHierarchy: string[] = [];
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
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
    <EmbedContent
      id={block.id}
      body={block.body}
      {mdStore}
      {isHovering}
      on:update
      on:delete
    />
  {:else if block.contentType === NodeType.CALLOUT}
    <Callout id={block.id} body={block.body} {mdStore} {isHovering} on:update />
  {:else if block.contentType === NodeType.CODE}
    <CodeContent body={block.body} {mdStore} on:update on:delete />
  {:else if headingNodeTypes.includes(block.contentType)}
    <HeadingContent
      id={block.id}
      bind:text={block.label}
      bind:isFocusing
      {mdStore}
      contentType={block.contentType}
      on:update
    />
  {:else if listNodeTypes.includes(block.contentType) && typeof block.body === "object"}
    <ListContent
      body={block.body}
      id={block.id}
      contentType={block.contentType}
      {isHovering}
      {mdStore}
      bind:isFocusing
      on:update
      on:blur
    />
  {:else if simpleTextNodeTypeList.includes(block.contentType) && typeof block.body === "string"}
    <TextContent
      bind:text={block.body}
      id={block.id}
      contentType={block.contentType}
      {mdStore}
      {isHovering}
      bind:isFocusing
      on:update
      on:blur
    />
  {:else}
    <span class="flex text-fgs3 text-b2"
      >This block is not available yet. Kindly refer the documentation or
      contact us.</span
    >
  {/if}
</div>
