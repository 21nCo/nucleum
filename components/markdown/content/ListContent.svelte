<script lang="ts">
  import {
    BlockContext,
    MdBlockType,
    type ListContent,
    type Block,
  } from "$lib/tidy/types/md.type";
  import { getMdStore } from "../markdown.store";
  import BlockContent from "./BlockContent.svelte";

  import TextContent from "./TextContent.svelte";
  export let mdId: string;
  export let content: ListContent;
  export let id: string | undefined = undefined;
  const mdStore = getMdStore(mdId);
  function handleInsert(event: any) {
    console.log("insert", event.detail);
    const insertContextId = event.detail.id;
    if ($mdStore.blocks.find((block: Block) => block.id === insertContextId)) {
      console.log("found in markdown");
      //TODO - handle if there are children to a list item - the children should move to the new list item when enter is pressed
      mdStore.insert(insertContextId, {
        blockType: MdBlockType.LIST,
      });
      return;
    } else {
      console.log("list child");
    }
  }
</script>

<div class="flex gap-2">
  <div
    class="w-1.5 h-1.5 min-w-[0.375rem] rounded-full bg-fgs1 my-4 mx-2"
  ></div>
  <div class="flex flex-col">
    <TextContent
      {mdId}
      content={typeof content.body.content === "string"
        ? { body: content.body.content, type: MdBlockType.SIMPLE_TEXT }
        : content.body.content}
      context={BlockContext.LIST_CHILD}
      on:insert={handleInsert}
      {id}
    />
    {#if content.children && content.children.length > 0}
      {#each content.children as item (item)}
        <BlockContent
          {mdId}
          content={item.content}
          id={item.id}
          context={BlockContext.LIST_CHILD}
          on:insert={handleInsert}
        />
      {/each}
    {/if}
  </div>
</div>
