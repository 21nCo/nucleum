<script lang="ts">
  import {
    BlockContext,
    BlockType,
    type ListContent,
  } from "$lib/tidy/types/md.type";
  import { mdStore } from "../markdown.store";
  import BlockContent from "./BlockContent.svelte";

  import TextContent from "./TextContent.svelte";
  export let content: ListContent;
  export let id: string | undefined = undefined;
  function handleInsert(event: any) {
    console.log("insert", event.detail);
    const insertContextId = event.detail.id;
    if ($mdStore.blocks.find((block) => block.id === insertContextId)) {
      console.log("found in markdown");
      //TODO - handle if there are children to a list item - the children should move to the new list item when enter is pressed
      mdStore.insert(insertContextId, {
        blockType: BlockType.LIST,
      });
      return;
    } else {
      console.log("list child");
    }
  }
</script>

<div class="flex gap-2">
  <div class="w-1.5 h-1.5 rounded-full bg-fgs1 my-4 mx-2"></div>
  <div class="flex flex-col">
    <TextContent
      content={typeof content.body.content === "string"
        ? { body: content.body.content, type: BlockType.SIMPLE_TEXT }
        : content.body.content}
      context={BlockContext.LIST_CHILD}
      on:insert={handleInsert}
      {id}
    />
    {#if content.children && content.children.length > 0}
      {#each content.children as item (item)}
        <BlockContent
          content={item.content}
          id={item.id}
          context={BlockContext.LIST_CHILD}
          on:insert={handleInsert}
        />
      {/each}
    {/if}
  </div>
</div>
