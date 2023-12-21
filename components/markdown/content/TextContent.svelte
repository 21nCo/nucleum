<script lang="ts">
  import { onMount } from "svelte";
  import {
    BlockType,
    type Block,
    type MdStore,
    type SpanContent,
    SpanType,
    type TextContent,
    MdContext,
  } from "$lib/tidy/types/md.type";
  import { mdContentChangeEvent, mdStore } from "../markdown.store";
  import TextWithSpans from "./TextWithSpans.svelte";
  import { generateUID } from "$lib/tidy/utils/utils";
  import { deepCopy } from "$lib/tidy/utils/obj.utils";
  export let block: Block;
  let blockRef: any;
  let sizing = "";
  const defaultPlaceholder =
    $mdStore.params?.placeholder ??
    ($mdStore.context === MdContext.NODE
      ? "Type / for all blocks"
      : "Start typing... ");
  let blockSpecificPlaceholder: string | undefined = undefined;
  let markerId = "caret-marker";
  let isNewSpanInserted = false;
  let caretPosition:
    | {
        element: any;
        parent: any;
        elementIndex: number;
        index: number;
      }
    | undefined = undefined;
  let caretPosition2: number | undefined = undefined;
  $: isDirectInsertBlock =
    block.type === BlockType.HEADING1 ||
    block.type === BlockType.HEADING2 ||
    block.type === BlockType.HEADING3 ||
    block.content === "";
  let spans: SpanContent[] =
    block.type === BlockType.TEXT && typeof block.content === "string"
      ? parseSpansFromText(block.content)
      : [];
  refreshInlineStyling();
  $: {
    switch (block.type) {
      case BlockType.HEADING1:
        sizing = "text-h1 font-bold";
        blockSpecificPlaceholder = "Heading 1";
        break;
      case BlockType.HEADING2:
        sizing = "text-h2 font-bold";
        blockSpecificPlaceholder = "Heading 2";
        break;
      case BlockType.HEADING3:
        sizing = "text-h3 font-bold";
        blockSpecificPlaceholder = "Heading 3";
        break;
      default:
        sizing = "text-base";
        break;
    }
  }

  function parseSpansFromText(text: string) {
    let spans: SpanContent[] = [];
    return spans;
  }

  function getSpanType(match: string) {
    let type: SpanType;
    const startAndEndCharacter = match.slice(0, 2);
    switch (startAndEndCharacter) {
      case "**":
        type = SpanType.BOLD;
        break;
      case "*":
        type = SpanType.ITALIC;
        break;
      case "_":
        type = SpanType.UNDERLINE;
        break;
      case "~~":
        type = SpanType.STRIKE;
        break;
      case "`":
        type = SpanType.CODE;
        break;
      default:
        type = SpanType.COLOR;
        break;
    }
    return type;
  }

  function getCursorPosition(element: any) {
    if (!element) return;
    let caretOffset = 0;
    const doc = element.ownerDocument || element.document;
    const win = doc.defaultView || doc.parentWindow;
    const sel = win.getSelection();

    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }

    return caretOffset;
  }
  // Function to insert a caret marker
  function insertCaretMarker() {
    const caretPosition = getCursorPosition(blockRef);
    if (typeof block.content !== "string") return;
    block.content =
      block.content.slice(0, caretPosition) +
      "<!--caret-->" +
      block.content.slice(caretPosition);
    // console.log("insertCaretMarker", block.content, caretPosition);
  }

  function setCaretPosition() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel?.getRangeAt(0);
    let element;
    let parent = range?.startContainer.parentElement;
    if (parent?.childNodes.length === 1) {
      element = parent?.childNodes[0];
    } else {
      const nextSibling = range.endContainer.nextSibling;
      if (nextSibling) {
        const nextSiblingIndex = Array.from(
          nextSibling.parentElement?.childNodes ?? []
        ).indexOf(nextSibling);
        element =
          range?.endContainer.parentElement?.childNodes[nextSiblingIndex - 1];
      } else {
        element =
          range?.endContainer.parentElement?.childNodes[
            range?.endContainer.parentElement?.childNodes.length - 1
          ];
      }
    }
    if (!element) return;
    caretPosition = {
      element,
      parent: range?.endContainer.parentElement,
      elementIndex: Array.from(
        range?.endContainer.parentElement?.childNodes ?? []
      ).indexOf(element),
      index: range?.endOffset ?? 0,
    };
    // console.log("setCaretPosition", range, caretPosition);
  }

  // Function to restore the caret position
  function restoreCursorPosition() {
    if (typeof block.content !== "string" || !blockRef) return;
    // console.log("restoreCursorPosition");
    //const index = block.content.indexOf("<!--caret-->");
    const index = caretPosition?.index ?? -1;
    if (index !== -1) {
      // const range = document.createRange();
      // const sel = window.getSelection();
      // range.setStart(blockRef, index);
      // range.collapse(true);
      // sel?.removeAllRanges();
      // sel?.addRange(range);
      //setCursorPosition(blockRef, index);
      // const ele = document.getElementById(caretPosition?.element ?? "");
      if (!caretPosition?.element) return;
      setCursorPosition(caretPosition?.element, index);
    }
    block.content = block.content.replace("<!--caret-->", "");
  }

  function restoreCaretPosition() {
    if (!caretPosition) return;
    // console.log("restoreCaretPosition", deepCopy(caretPosition));
    const range = document.createRange();
    const selection = window.getSelection();
    let node = caretPosition.element;
    try {
      const parent = document.getElementById(caretPosition.parent.id);
      if (isNewSpanInserted) {
        // console.log(
        //   "eleIndex",
        //   caretPosition.elementIndex,
        //   caretPosition.parent.childNodes,
        //   parent?.childNodes
        // );
        node = parent
          ? parent?.childNodes[caretPosition.elementIndex + 2]
          : caretPosition.parent.childNodes[caretPosition.elementIndex + 2];
      } else {
        node = parent
          ? parent?.childNodes[caretPosition.elementIndex]
          : caretPosition.parent.childNodes[caretPosition.elementIndex];
      }
      // console.log("restoring to element", node);
      if (isNewSpanInserted) {
        // setCursorToEnd(node);
        range.setStart(node, 0);
        // console.log("restoring to range", range);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      } else {
        range.setStart(node, caretPosition.index - 1);
        // console.log("restoring to range", range);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    } catch (error) {
      console.log("restoring caret errored", error);
    }
  }
  function setCursorPosition(element: any, index: any) {
    const selection = window.getSelection();
    const range = document.createRange();
    selection?.removeAllRanges();
    let currentLength = 0;
    let found = false;
    // Recursive function to walk through child nodes
    function setRange(node: any) {
      // console.log(node);
      if (node.nodeType === 3) {
        // Text node
        const nextLength = currentLength + node.length;
        if (!found && nextLength > index) {
          range.setStart(node, index - currentLength);
          range.collapse(true);
          found = true;
        }
        currentLength = nextLength;
      } else {
        node.childNodes.forEach(setRange);
      }
    }
    setRange(element);
    if (found) {
      selection?.addRange(range);
    } else {
      const eleIndex = Array.from(element.parentElement.childNodes).indexOf(
        element
      );
      element = element.parentElement.childNodes[eleIndex + 1];
      if (element) {
        setCursorPosition(element, 0);
      }
    }
  }
  function setCursorToEnd(element: any) {
    if (!element) return;
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // console.log("setCursorToEnd", element, range, selection);
  }
  onMount(() => {
    // console.log("mounted");
    // console.log({ blockRef, style: blockRef.style.caretColor });
    blockRef?.focus();
    const focusBlockSub = mdStore.subscribe((md: MdStore) => {
      if (md.focusedBlockId === block.id) {
        setCursorToEnd(blockRef);
      }
    });
    return () => {
      focusBlockSub();
    };
  });
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
    replaceWithUnicodeCharacters();
    if (
      event.key != "Backspace" &&
      (event.key === "*" ||
        event.key === "_" ||
        event.key === "`" ||
        event.key === "~")
    )
      refreshInlineStyling();
    mdContentChangeEvent.trigger();
  }
  function replaceWithUnicodeCharacters() {
    // console.log("replaceWithUnicodeCharacters");
    const patterns = [
      { regex: /←&gt;/g, replacement: "↔" },
      { regex: /-&gt;/g, replacement: "→" },
      { regex: /&lt;-/g, replacement: "←" },
      { regex: /&lt;=/g, replacement: "≤" },
      { regex: /&gt;=/g, replacement: "≥" },
      { regex: /=&gt;/g, replacement: "⇒" },
    ];
    patterns.forEach(({ regex, replacement }) => {
      if (typeof block.content !== "string") return;
      const matches = block.content.match(regex);
      if (matches) {
        // console.log(
        //   `Found ${matches.length} matches for ${regex}. Each match will be replaced with ${replacement.length} characters.`
        // );
        setCaretPosition();
        // console.log("caretPosition", caretPosition);
        block.content = block.content.replace(regex, replacement);
        // if (caretPosition) caretPosition.index = caretPosition?.index - 1 ?? 0;
        // restoreCaretPosition();
        setTimeout(() => {
          restoreCaretPosition();
        }, 10);
      }
    });
  }

  function refreshInlineStyling() {
    if (typeof block.content !== "string") return;
    //insertCaretMarker();
    // console.log("refreshInlineStyling");
    block.content = block.content
      .replace(/\*\*([^\*]+?)\*\*/g, `<b id="${generateUID()}">$1</b>&nbsp;`)
      .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, "<i>$1</i>&nbsp;")
      .replace(/\*\*([^\*]+?)\*\*/g, `<b id="${generateUID()}">$1</b>&nbsp;`)
      .replace(/_((?:\s*\S)+?)_/g, "<u>$1</u>&nbsp;") //
      .replace(
        /~~((?:\S|\s\S)+?)~~/g,
        `<span id="${generateUID()}" class="line-through">$1</span>&nbsp;`
      )
      .replace(
        /`((?:\S|\s\S)+?)`/g,
        `<span id="${generateUID()}" class="bg-gray-200 px-1 font-mono">$1</span>&nbsp;`
      )
      .replace(
        /#\[((?:\S|\s\S)+?)\]\(([^)]+?)\)/g,
        '<span style="color:$2">$1</span>'
      );
    isNewSpanInserted = true;
    setTimeout(() => {
      restoreCaretPosition();
      isNewSpanInserted = false;
    }, 10);
    //restoreCaretPosition();
    //restoreCursorPosition();
  }

  function handleKeyPress(event: any) {
    // console.log("keypress", event, block);
  }
  function handleMouseup(event: any) {
    setCaretPosition();
    // console.log("mouseup", event, block);
  }
</script>

{#if typeof block.content === "string"}
  <div
    bind:this={blockRef}
    id={block.id}
    style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word; caret-color: rgb(55, 53, 47);"
    class="w-full h-full outline-none p-2 {sizing}"
    on:keyup={handleKeyUp}
    on:keydown={handleKeyDown}
    on:keypress={handleKeyPress}
    on:mouseup={handleMouseup}
    bind:innerHTML={block.content}
    contenteditable
  ></div>
  <!-- {:else if Array.isArray(block.content)} -->
{:else if spans.length > 0}
  <div contenteditable class="outline-none">
    <TextWithSpans content={spans} />
  </div>
{/if}
{#if !block.content}
  <button
    on:click={() => {
      blockRef.focus();
    }}
    class="absolute top-0 left-0 cursor-text p-2 {sizing} {blockSpecificPlaceholder
      ? 'text-bgs4'
      : 'text-fgs3 ml-1'}"
  >
    {blockSpecificPlaceholder ?? defaultPlaceholder}
  </button>
{/if}
