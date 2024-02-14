<script lang="ts">
  import {
    BlockContext,
    MdBlockType,
    type ListContent,
    type Block,
    ListType
  } from "$lib/tidy/types/md.type";
  import { getMdStore } from "../markdown.store";
  import BlockContent from "./BlockContent.svelte";
  import TextContent from "./TextContent.svelte";
  export let mdId: string;
  export let content: ListContent;
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  export let id: string | undefined = undefined;
  export let parentHierarchy: string[] = [];
  const mdStore = getMdStore(mdId);
  function handleInsert(event: any) {
    console.log("insert in list", event.detail, parentHierarchy);
    const insertContextId = event.detail;
    mdStore.handleInsertForExistingList(insertContextId, parentHierarchy);
  }
  function handleTab(event: CustomEvent) {
    // console.log("tab in list", event.detail, parentHierarchy);
    mdStore.listOperation(event.type, id!, parentHierarchy);
  }
</script>

<div class="flex gap-2">
  {#if content.body.type === ListType.ORDERED}
    <div class="w-1.5 h-1.5 min-w-[0.375rem] bg-fgs1 my-4 mx-2"></div>
  {:else}
    <div
      class="w-1.5 h-1.5 min-w-[0.375rem] rounded-full bg-fgs1 my-4 mx-2"
    ></div>
  {/if}

  <div class="flex flex-col w-full">
    <TextContent
      bind:isFocusing
      on:blur
      on:insert={handleInsert}
      on:tab={handleTab}
      on:shifttab={handleTab}
      {mdId}
      {isHovering}
      {id}
      context={BlockContext.LIST_CHILD}
      content={typeof content.body.content === "string"
        ? { body: content.body.content, type: MdBlockType.SIMPLE_TEXT }
        : content.body.content}
    />
    {#if content.children && content.children.length > 0}
      {#each content.children as item (item)}
        <BlockContent
          {mdId}
          {isHovering}
          parentHierarchy={id ? [...parentHierarchy, id] : parentHierarchy}
          content={item.content}
          id={item.id}
          context={BlockContext.LIST_CHILD}
        />
      {/each}
    {/if}
  </div>
</div>
