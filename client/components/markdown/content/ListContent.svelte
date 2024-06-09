<script lang="ts">
  import type { IBlock } from "$lib/client/types/memotron/md.type";
  import {
    ListType,
    NodeType,
    type ListContent
  } from "$lib/client/types/memotron/node.type";
  import type { MdStoreType } from "../markdown.store";
  import BlockContent from "./BlockContent.svelte";
  import TextContent from "./TextContent.svelte";
  export let mdStore: MdStoreType;
  export let block: IBlock<ListContent>;
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  export let parentHierarchy: string[] = [];
  function handleInsert(event: any) {
    console.log("insert in list", event.detail, parentHierarchy);
    const insertContextId = event.detail;
    mdStore.handleInsertForExistingList(insertContextId, parentHierarchy);
  }
  function handleTab(event: CustomEvent) {
    // console.log("tab in list", event.detail, parentHierarchy);
    if (event.type != "tab" && event.type != "shifttab") return;
    mdStore.listOperation({
      operation: event.type,
      id: block.id,
      parentHierarchy
    });
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
      on:insertrelay={handleInsert}
      on:deleterelay
      on:tab={handleTab}
      on:shifttab={handleTab}
      on:change
      on:insert
      on:convert
      on:delete
      {mdStore}
      {isHovering}
      {block}
    />
    {#if block.children && block.children.length > 0}
      <!--           context={BlockContext.LIST_CHILD} -->
      {#each block.children as item (item)}
        <BlockContent
          {mdStore}
          {isHovering}
          parentHierarchy={block.id
            ? [...parentHierarchy, block.id]
            : parentHierarchy}
          block={item}
          on:change
          on:insert
          on:convert
          on:delete
        />
      {/each}
    {/if}
  </div>
</div>
