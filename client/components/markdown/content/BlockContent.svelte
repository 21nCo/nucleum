<script lang="ts">
  import type { IBlock } from "@21n/components/markdown/md.type";
  import {
    headingNodeTypes,
    listNodeTypes,
    NodeType,
    simpleTextNodeTypeList,
    type IMediaGridNode
  } from "@21n/products/memotron/node/node.type";
  import EmbedContent from "@21n/components/markdown/embed/EmbedContent.svelte";
  import type { MdStoreType } from "@21n/components/markdown/markdown.store";
  import MediaGrid from "@21n/components/markdown/mediaGrid/MediaGrid.svelte";
  import Callout from "@21n/components/markdown/callout/Callout.svelte";
  import TextContent from "@21n/components/markdown/content/TextContent.svelte";
  import CodeContent from "@21n/components/markdown/content/CodeContent.svelte";
  import ListContent from "@21n/components/markdown/lists/ListContent.svelte";
  import HeadingContent from "@21n/components/markdown/content/HeadingContent.svelte";
  import { cn } from "@21n/utils/ui.utils";
  export let mdStore: MdStoreType;
  export let block: IBlock;
  /**
   * @deprecated - used with ListContent v1 approach
   */
  export let parentHierarchy: string[] = [];
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  $: parentHierarchy;
  $: mediaGridBlock = block as unknown as IMediaGridNode;
</script>

<div
  class={cn("relative w-full", {
    "h-fit": block.contentType === NodeType.EMBED,
    "flex-grow": block.contentType !== NodeType.EMBED
  })}
>
  {#if block.contentType === NodeType.DIVIDER}
    <div class="h-px bg-brs3 my-4"></div>
  {:else if block.contentType === NodeType.DOUBLE_DIVIDER}
    <div class="flex flex-col my-1 gap-0.5">
      <div class="h-px bg-bgs4"></div>
      <div class="h-px bg-bgs4"></div>
    </div>
  {:else if block.contentType === NodeType.MEDIA_GRID}
    <MediaGrid block={mediaGridBlock} {mdStore} on:delete />
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
    <span class="flex text-ars1 text-b2"
      >Unable to load this block's content.</span
    >
  {/if}
</div>
