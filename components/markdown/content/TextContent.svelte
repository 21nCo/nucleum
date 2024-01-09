<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import {
    MdBlockType,
    type MdStore,
    type SpanContent,
    SpanType,
    MdContext,
    type TextContent,
    BlockContext,
    type TextType,
    ListType
  } from "$lib/tidy/types/md.type";
  import { getMdStore, mdContentChangeEvent } from "../markdown.store";
  import TextWithSpans from "./TextWithSpans.svelte";
  import { generateUID } from "$lib/tidy/utils/utils";
  import { windowObject } from "$lib/tidy/stores/app.store";
  const dispatch = createEventDispatcher();
  export let mdId: string;
  export let content: TextContent;
  export let id: string | undefined = undefined;
  export let context: BlockContext = BlockContext.DEFAULT;
  const mdStore = getMdStore(mdId);
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
        element?: any;
        parent?: any;
        elementIndex?: number;
        index: number;
        elementId?: string;
        endContainer?: any;
      }
    | undefined = undefined;
  let caretPosition2: number | undefined = undefined;
  $: isDirectInsertBlock =
    content.type === MdBlockType.HEADING1 ||
    content.type === MdBlockType.HEADING2 ||
    content.type === MdBlockType.HEADING3 ||
    content.type === MdBlockType.HEADING4 ||
    content.type === MdBlockType.HEADING5 ||
    context === BlockContext.LIST_CHILD ||
    content.body === "";
  let spans: SpanContent[] =
    content.type === MdBlockType.SIMPLE_TEXT && typeof content.body === "string"
      ? parseSpansFromText(content.body)
      : [];
  refreshInlineStyling();
  $: {
    switch (content.type) {
      case MdBlockType.HEADING1:
        sizing = "text-h1 font-bold";
        blockSpecificPlaceholder = "Heading 1";
        break;
      case MdBlockType.HEADING2:
        sizing = "text-h2 font-bold";
        blockSpecificPlaceholder = "Heading 2";
        break;
      case MdBlockType.HEADING3:
        sizing = "text-h3 font-bold";
        blockSpecificPlaceholder = "Heading 3";
        break;
      case MdBlockType.HEADING4:
        sizing = "text-h4 font-bold";
        blockSpecificPlaceholder = "Heading 4";
        break;
      case MdBlockType.HEADING5:
        sizing = "text-h5 font-bold";
        blockSpecificPlaceholder = "Heading 5";
        break;
      case MdBlockType.QUOTE:
        sizing = "font-medium";
        blockSpecificPlaceholder = "Quote";
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
    if (typeof content.body !== "string") return;
    content.body =
      content.body.slice(0, caretPosition) +
      "<!--caret-->" +
      content.body.slice(caretPosition);
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
      endContainer: range?.endContainer
    };
    console.log("setCaretPosition", range, caretPosition);
  }

  // Function to restore the caret position
  function restoreCursorPosition() {
    if (typeof content.body !== "string" || !blockRef) return;
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
    content.body = content.body.replace("<!--caret-->", "");
  }
  function setCursorToSpan(spanElement: any) {
    console.log("setCursorToSpan", spanElement);
    const range = document.createRange();
    range.selectNodeContents(spanElement);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  function restoreCaretPosition() {
    if (!caretPosition) return;
    // console.log("restoreCaretPosition", deepCopy(caretPosition));
    const range = document.createRange();
    const selection = window.getSelection();
    try {
      console.log({ isNewSpanInserted, caretPosition });
      if (isNewSpanInserted && caretPosition.elementIndex != undefined) {
        const parent = document.getElementById(caretPosition.parent.id);
        console.log(
          "eleIndex",
          caretPosition?.elementId,
          caretPosition.elementIndex,
          caretPosition.parent.childNodes,
          parent?.childNodes
        );
        if (!parent?.childNodes) return;
        // const node = parent
        //   ? parent?.childNodes[caretPosition.elementIndex + 1]
        //   : caretPosition.parent.childNodes[caretPosition.elementIndex + 1];
        // const node = document.getElementById(caretPosition.elementId);
        // setCursorToEnd(node);
        const node = Array.from(parent?.childNodes).find(
          (node: ChildNode) => (node as Element).id === caretPosition?.elementId
        );
        console.log("new span node", node, caretPosition);
        if (node) range.setStart(node, 1);
      } else if (caretPosition.elementIndex != undefined) {
        console.log("ss");
        let node = caretPosition.element;
        const parent = document.getElementById(caretPosition.parent.id);
        node = parent
          ? parent?.childNodes[caretPosition.elementIndex]
          : caretPosition.parent.childNodes[caretPosition.elementIndex];
        range.setStart(node, caretPosition.index - 1);
      }
      // console.log("restoring to range", range);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
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
    if (!$windowObject.isInPortraitMode) blockRef?.focus();
    const focusBlockSub = mdStore.subscribe((md: MdStore) => {
      if (md.focusedBlockId === id) {
        setCursorToEnd(blockRef);
      }
    });
    return () => {
      focusBlockSub();
    };
  });
  function handleKeyDown(event: any) {
    console.log("keydown", event);
    if (
      (event.key === "Enter" && event.metaKey == true) ||
      (event.key === "Enter" && isDirectInsertBlock && !event.shiftKey)
    ) {
      if (id && context === BlockContext.DEFAULT) mdStore.insert(id);
      else dispatch("insert", { id });
      event.preventDefault();
    } else if (event.key === "Backspace" && !content.body) {
      if (id && context === BlockContext.DEFAULT) mdStore.deleteBlock(id);
      else dispatch("delete", { id });
      event.preventDefault();
    }
  }

  function handleKeyUp(event: any) {
    console.log("keyup", event);
    setCaretPosition();
    const textEscapeShortcuts: { shortcut: string; type: TextType }[] = [
      { shortcut: "# ", type: MdBlockType.HEADING1 },
      { shortcut: "## ", type: MdBlockType.HEADING2 },
      { shortcut: "### ", type: MdBlockType.HEADING3 },
      { shortcut: "#### ", type: MdBlockType.HEADING4 },
      { shortcut: "##### ", type: MdBlockType.HEADING5 },
      { shortcut: '" ', type: MdBlockType.QUOTE }
    ];
    const structuralEscapeShortcuts = [
      { shortcut: "---", type: MdBlockType.DIVIDER },
      { shortcut: "===", type: MdBlockType.DOUBLE_DIVIDER }
    ];
    const listEscapeShortcuts = [
      { shortcut: "* ", type: MdBlockType.LIST, listType: ListType.UNORDERED },
      { shortcut: "- ", type: MdBlockType.LIST, listType: ListType.UNORDERED },
      { shortcut: "+ ", type: MdBlockType.LIST, listType: ListType.UNORDERED },
      { shortcut: "1. ", type: MdBlockType.LIST, listType: ListType.ORDERED }
    ];
    textEscapeShortcuts.forEach(({ shortcut, type }) => {
      if (typeof content.body !== "string") return;
      if (content.body.startsWith(shortcut)) {
        content.body = content.body.replace(shortcut, "");
        content.type = type;
      }
      if (
        content.type === MdBlockType.SIMPLE_TEXT &&
        caretPosition &&
        caretPosition.endContainer.nodeType === 3 &&
        caretPosition.endContainer.nodeValue &&
        caretPosition.endContainer.nodeValue.startsWith(shortcut)
      ) {
        //delete the parent <div> of the text node and insert new block with the type
        content.body = content.body.replace(shortcut, "");
        if (id) mdStore.insert(id, { blockType: type });
        setTimeout(() => {
          let parent = undefined;
          if (id) parent = document.getElementById(id);
          console.log("parent", parent, parent?.lastChild);
          if (parent && parent.lastChild) {
            parent.removeChild(parent.lastChild);
          }
        }, 10);
      }
    });

    // if (typeof content.body !== "string") return;
    // if (content.body.startsWith("# ")) {
    //   content.body = content.body.replace("# ", "");
    //   content.type = BlockType.HEADING1;
    // } else if (content.body.startsWith("## ")) {
    //   content.body = content.body.replace("## ", "");
    //   content.type = BlockType.HEADING2;
    // } else if (content.body.startsWith("### ")) {
    //   content.body = content.body.replace("### ", "");
    //   content.type = BlockType.HEADING3;
    // } else if (content.body.startsWith("#### ")) {
    //   content.body = content.body.replace("#### ", "");
    //   content.type = BlockType.HEADING4;
    // } else if (content.body.startsWith("##### ")) {
    //   content.body = content.body.replace("##### ", "");
    //   content.type = BlockType.HEADING5;
    // } else
    if (content.body === "---") {
      content.body = "";
      if (context != BlockContext.DEFAULT || !id) return;
      mdStore.insert(id, { blockType: MdBlockType.DIVIDER });
    } else if (content.body === "===") {
      content.body = "";
      if (context != BlockContext.DEFAULT || !id) return;
      mdStore.insert(id, { blockType: MdBlockType.DOUBLE_DIVIDER });
    } else if (
      event.key === "Backspace" &&
      content.type != MdBlockType.SIMPLE_TEXT &&
      content.body != "" &&
      caretPosition?.index === 0
    ) {
      content.type = MdBlockType.SIMPLE_TEXT;
    } else if (
      event.key === "Backspace" &&
      content.type === MdBlockType.SIMPLE_TEXT &&
      content.body != "" &&
      caretPosition?.index === 0
    ) {
      if (id && context === BlockContext.DEFAULT)
        mdStore.focusPreviousSibling(id);
      else dispatch("delete", { id });
      event.preventDefault();
    } else if (event.key) {
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
      { regex: /=&gt;/g, replacement: "⇒" }
    ];
    executeReplace(patterns);
  }

  function executeReplace(patterns: any[], isNewSpanInsert = false) {
    patterns.forEach(({ regex, replacement }) => {
      if (typeof content.body !== "string") return;
      const matches = content.body.match(regex);
      if (matches) {
        // console.log(
        //   `Found ${matches.length} matches for ${regex}. Each match will be replaced with ${replacement.length} characters.`
        // );
        let focusedSpan = generateUID();
        if (isNewSpanInsert) {
          setCaretPosition();
          caretPosition = {
            ...caretPosition,
            index: caretPosition?.index ?? 0,
            elementId: focusedSpan
          };
          isNewSpanInserted = true;
          content.body = content.body.replace(
            regex,
            replacement + `<span id="${focusedSpan}">&#8203;</span>`
          );
          // console.log("new span inserted", focusedSpan);
          // setCursorToSpan(document.getElementById(focusedSpan));
          // return;
        } else {
          setCaretPosition();
          content.body = content.body.replace(regex, replacement);
        }

        // console.log("caretPosition", caretPosition);
        //content.body = content.body.replace(regex, replacement);
        // if (caretPosition) caretPosition.index = caretPosition?.index - 1 ?? 0;
        // restoreCaretPosition();
        setTimeout(() => {
          restoreCaretPosition();
          isNewSpanInserted = false;
        }, 10);
      }
    });
  }

  function refreshInlineStyling() {
    if (typeof content.body !== "string") return;
    const patterns = [
      { regex: /(?<!\*)\*([^\*]+?)\*(?!\*)/g, replacement: "<i>$1</i>" },
      { regex: /\*\*([^\*]+?)\*\*/g, replacement: "<b>$1</b>" },
      { regex: /_((?:\s*\S)+?)_/g, replacement: "<u>$1</u>" },
      {
        regex: /~~((?:\S|\s\S)+?)~~/g,
        replacement: '<span class="line-through">$1</span>'
      },
      {
        regex: /`((?:\S|\s\S)+?)`/g,
        replacement: '<span class="bg-gray-200 px-1 font-mono">$1</span>'
      },
      {
        regex: /#\[((?:\S|\s\S)+?)\]\(([^)]+?)\)/g,
        replacement: '<span style="color:$2">$1</span>'
      }
    ];
    executeReplace(patterns, true);
    //insertCaretMarker();
    // console.log("refreshInlineStyling");
    // setCaretPosition();
    // content.body = content.body
    //   .replace(/\*\*([^\*]+?)\*\*/g, `<b id="${generateUID()}">$1</b>&nbsp;`)
    //   .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, "<i>$1</i>&nbsp;")
    //   .replace(/\*\*([^\*]+?)\*\*/g, `<b id="${generateUID()}">$1</b>&nbsp;`)
    //   .replace(/_((?:\s*\S)+?)_/g, "<u>$1</u>&nbsp;") //
    //   .replace(
    //     /~~((?:\S|\s\S)+?)~~/g,
    //     `<span id="${generateUID()}" class="line-through">$1</span>&nbsp;`
    //   )
    //   .replace(
    //     /`((?:\S|\s\S)+?)`/g,
    //     `<span id="${generateUID()}" class="bg-gray-200 px-1 font-mono">$1</span>&nbsp;`
    //   )
    //   .replace(
    //     /#\[((?:\S|\s\S)+?)\]\(([^)]+?)\)/g,
    //     '<span style="color:$2">$1</span>'
    //   );
    // isNewSpanInserted = true;
    // setTimeout(() => {
    //   restoreCaretPosition();
    //   isNewSpanInserted = false;
    // }, 10);
    // //restoreCaretPosition();
    // //restoreCursorPosition();
  }

  function handleKeyPress(event: any) {
    // console.log("keypress", event, block);
  }
  function handleMouseup(event: any) {
    setCaretPosition();
    // console.log("mouseup", event, block);
  }
</script>

{#if typeof content.body === "string"}
  <div class="relative">
    {#if $mdStore.params?.isReadOnly}
      <div
        {id}
        style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
        class="w-full h-full outline-none p-2 {sizing}"
      >
        {@html content.body}
      </div>
    {:else}
      <div
        bind:this={blockRef}
        {id}
        style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
        class="w-full h-full outline-none p-2 {sizing}"
        on:keyup={handleKeyUp}
        on:keydown={handleKeyDown}
        on:keypress={handleKeyPress}
        on:mouseup={handleMouseup}
        bind:innerHTML={content.body}
        contenteditable
      ></div>
    {/if}
    {#if content.type === MdBlockType.QUOTE}
      <div class="absolute top-0 left-0 h-full w-0.5 bg-a1"></div>
    {/if}
  </div>

  <!-- {:else if Array.isArray(block.content)} -->
{:else if spans.length > 0}
  <div contenteditable class="outline-none">
    <TextWithSpans content={spans} />
  </div>
{/if}
{#if !content.body && !$mdStore.params.isReadOnly}
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

<style>
  div[contenteditable] {
    caret-color: rgba(var(--colors-fgs2), 1) !important;
  }
</style>
