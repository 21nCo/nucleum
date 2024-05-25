<script lang="ts">
  import type { Block } from "$lib/client/types/memotron/md.type";
  import {
    ListType,
    NodeType,
    type ListContent
  } from "$lib/client/types/memotron/node.type";
  import { getMdStore } from "../markdown.store";
  import BlockContent from "./BlockContent.svelte";
  import TextContent from "./TextContent.svelte";
  export let mdId: string;
  export let block: Block<ListContent>;
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  export let parentHierarchy: string[] = [];
  const mdStore = getMdStore(mdId);
  function handleInsert(event: any) {
    console.log("insert in list", event.detail, parentHierarchy);
    const insertContextId = event.detail;
    mdStore.handleInsertForExistingList(insertContextId, parentHierarchy);
  }
  function handleTab(event: CustomEvent) {
    // console.log("tab in list", event.detail, parentHierarchy);
    mdStore.listOperation(event.type, block.id, parentHierarchy);
  }
</script>

<div class="flex gap-2">
  {#if block.listType === ListType.ORDERED}
    <div class="w-1.5 h-1.5 min-w-[0.375rem] bg-fgs1 my-4 mx-2"></div>
  {:else}
    <div
      class="w-1.5 h-1.5 min-w-[0.375rem] rounded-full bg-fgs1 my-4 mx-2"
    ></div>
  {/if}

  <div class="flex flex-col w-full">
    <!-- 
      context={BlockContext.LIST_CHILD}
      block={typeof block.body != "string"
        ? { ...block.body, id: block.id }
        : { body: block.body, type: NodeType.SIMPLE_TEXT, id: block.id }} 
      -->
    <TextContent
      bind:isFocusing
      on:blur
      on:insert={handleInsert}
      on:tab={handleTab}
      on:shifttab={handleTab}
      {mdId}
      {isHovering}
      {block}
    />
    {#if block.children && block.children.length > 0}
      <!--           context={BlockContext.LIST_CHILD} -->
      {#each block.children as item (item)}
        <BlockContent
          {mdId}
          {isHovering}
          parentHierarchy={block.id
            ? [...parentHierarchy, block.id]
            : parentHierarchy}
          block={item}
        />
      {/each}
    {/if}
  </div>
</div>
