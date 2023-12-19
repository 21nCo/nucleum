<script lang="ts">
  import { onMount } from "svelte";
  import { BlockType, type Block, type MdStore } from "$lib/tidy/types/md.type";
  import { mdStore } from "../markdown.store";
  import TextWithSpans from "./TextWithSpans.svelte";
  export let block: Block;
  let blockRef: any;
  let sizing = "";
  const defaultPlaceholder = "Type / for all blocks";
  let blockSpecificPlaceholder: string | undefined = undefined;

  $: {
    switch (block.type) {
      case BlockType.HEADING1:
        sizing = "text-h1";
        blockSpecificPlaceholder = "Heading 1";
        break;
      case BlockType.HEADING2:
        sizing = "text-h2";
        blockSpecificPlaceholder = "Heading 2";
        break;
      case BlockType.HEADING3:
        sizing = "text-h3";
        blockSpecificPlaceholder = "Heading 3";
        break;
      default:
        sizing = "text-base";
        break;
    }
  }

  function setCursorToEnd(element: any) {
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  onMount(() => {
    // console.log("mounted");
    // console.log({ blockRef, style: blockRef.style.caretColor });
    blockRef.focus();
    const focusBlockSub = mdStore.subscribe((md: MdStore) => {
      if (md.focusedBlockId === block.id) {
        setCursorToEnd(blockRef);
      }
    });
    return () => {
      focusBlockSub();
    };
  });
  $: isDirectInsertBlock =
    block.type === BlockType.HEADING1 ||
    block.type === BlockType.HEADING2 ||
    block.type === BlockType.HEADING3 ||
    block.content === "";
  function handleKeyDown(event: any) {
    // console.log("keydown", event, block);
    if (
      (event.key === "Enter" && event.metaKey == true) ||
      (event.key === "Enter" && isDirectInsertBlock && !event.shiftKey)
    ) {
      mdStore.insert(block.id);
      event.preventDefault();
    } else if (event.key === "Backspace" && !block.content) {
      mdStore.deleteBlock(block.id);
      event.preventDefault();
    }
  }
  function handleKeyUp(event: any) {
    // console.log("keyup", event, block);
    if (block.content === "# ") {
      block.content = "";
      block.type = BlockType.HEADING1;
    } else if (block.content === "## ") {
      block.content = "";
      block.type = BlockType.HEADING2;
    } else if (block.content === "### ") {
      block.content = "";
      block.type = BlockType.HEADING3;
    } else if (block.content === "---") {
      block.content = "";
      block.type = BlockType.DIVIDER;
      mdStore.insert(block.id);
    }
  }
  function handleKeyPress(event: any) {
    // console.log("keypress", event, block);
  }
</script>

{#if typeof block.content === "string"}
  <div
    bind:this={blockRef}
    style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word; caret-color: rgb(55, 53, 47);"
    class="w-full h-full outline-none p-2 {sizing}"
    on:keyup={handleKeyUp}
    on:keydown={handleKeyDown}
    on:keypress={handleKeyPress}
    bind:innerHTML={block.content}
    contenteditable
  ></div>
{:else if Array.isArray(block.content)}
  <TextWithSpans content={block.content} />
{/if}
{#if !block.content}
  <button
    on:click={() => {
      blockRef.focus();
    }}
    class="absolute top-0 left-0 text-fgs3 cursor-text p-2 {sizing} {!blockSpecificPlaceholder &&
      'ml-1'}"
  >
    {blockSpecificPlaceholder ?? defaultPlaceholder}
  </button>
{/if}
