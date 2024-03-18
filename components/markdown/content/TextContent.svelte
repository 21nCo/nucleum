<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import {
    type MdStore,
    type SpanContent,
    SpanType,
    BlockContext,
    type Block
  } from "$lib/tidy/types/md.type";
  import { getMdStore, mdContentChangeEvent } from "../markdown.store";
  import TextWithSpans from "./TextWithSpans.svelte";
  import { generateUID } from "$lib/tidy/utils/utils";
  import BlockBrowser from "../blockBrowser/BlockBrowser.svelte";
  import { renderPopoverv2 } from "$lib/tidy/utils/browser.utils";
  import { Direction } from "$lib/tidy/types/direction.enum";
  import { isInEditMode } from "$lib/tidy/stores/app.store";
  import {
    ListType,
    NodeType,
    type TextContent,
    type TextNodeType
  } from "$lib/tidy/types/node.type";
  const dispatch = createEventDispatcher();
  export let mdId: string;
  export let block: Block<TextContent>;
  export let context: BlockContext = BlockContext.DEFAULT;
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  $: {
    if (isHovering) assignPlaceholder();
    else if (!isFocusing) placeholder = "";
  }
  const mdStore = getMdStore(mdId);
  let blockRef: any;
  let sizing = "";
  const defaultPlaceholder =
    $mdStore.params?.placeholder ??
    ($mdStore.params?.isNodular ? "Type / for all blocks" : "Start typing... ");
  let blockSpecificPlaceholder: string | undefined = undefined;
  let placeholder: string;
  let markerId = "caret-marker";
  let isNewSpanInserted = false;
  let blockBrowserContainerRef: HTMLElement;
  let blockBrowserRef: any;
  let isRenderBlockBrowser: boolean = false;
  let isCustomCaret = false;
  let customCaret: HTMLElement | null = null;
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
    block.type === NodeType.HEADING1 ||
    block.type === NodeType.HEADING2 ||
    block.type === NodeType.HEADING3 ||
    block.type === NodeType.HEADING4 ||
    block.type === NodeType.HEADING5 ||
    context === BlockContext.LIST_CHILD ||
    block.body === "";
  let spans: SpanContent[] =
    block.type === NodeType.SIMPLE_TEXT && typeof block.body === "string"
      ? parseSpansFromText(block.body)
      : [];
  refreshInlineStyling();
  $: {
    switch (block.type) {
      case NodeType.HEADING1:
        sizing = "text-h1 font-bold";
        blockSpecificPlaceholder = "Heading 1";
        break;
      case NodeType.HEADING2:
        sizing = "text-h2 font-bold";
        blockSpecificPlaceholder = "Heading 2";
        break;
      case NodeType.HEADING3:
        sizing = "text-h3 font-bold";
        blockSpecificPlaceholder = "Heading 3";
        break;
      case NodeType.HEADING4:
        sizing = "text-h4 font-bold";
        blockSpecificPlaceholder = "Heading 4";
        break;
      case NodeType.HEADING5:
        sizing = "text-h5 font-bold";
        blockSpecificPlaceholder = "Heading 5";
        break;
      case NodeType.QUOTE:
        sizing = "font-medium";
        blockSpecificPlaceholder = "Quote";
        break;
      default:
        sizing = "text-base";
        blockSpecificPlaceholder = undefined;
        break;
    }
    if (isFocusing) assignPlaceholder();
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
    if (typeof block.body !== "string") return;
    block.body =
      block.body.slice(0, caretPosition) +
      "<!--caret-->" +
      block.body.slice(caretPosition);
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
    // console.log("setCaretPosition", range, caretPosition);
  }

  // Function to restore the caret position
  function restoreCursorPosition() {
    if (typeof block.body !== "string" || !blockRef) return;
    // console.log("restoreCursorPosition");
    //const index = block.block.indexOf("<!--caret-->");
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
    block.body = block.body.replace("<!--caret-->", "");
  }
  function setCursorToSpan(spanElement: any) {
    //console.log("setCursorToSpan", spanElement);
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
      //console.log({ isNewSpanInserted, caretPosition });
      if (isNewSpanInserted && caretPosition.elementIndex != undefined) {
        const parent = document.getElementById(caretPosition.parent.id);
        // console.log(
        //   "eleIndex",
        //   caretPosition?.elementId,
        //   caretPosition.elementIndex,
        //   caretPosition.parent.childNodes,
        //   parent?.childNodes
        // );
        if (!parent?.childNodes) return;
        // const node = parent
        //   ? parent?.childNodes[caretPosition.elementIndex + 1]
        //   : caretPosition.parent.childNodes[caretPosition.elementIndex + 1];
        // const node = document.getElementById(caretPosition.elementId);
        // setCursorToEnd(node);
        const node = Array.from(parent?.childNodes).find(
          (node: ChildNode) => (node as Element).id === caretPosition?.elementId
        );
        // console.log("new span node", node, caretPosition);
        if (node) range.setStart(node, 1);
      } else if (caretPosition.elementIndex != undefined) {
        // console.log("ss");
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
    // console.log("setCursorToEnd", element);
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
    // if (!$view.isPortrait) {
    //   console.log("focusing block from mount", blockRef);
    //   blockRef?.focus();
    // }
    customCaret = document.getElementById("customcaret");
    console.log("caret", customCaret);
    hideBlockBrowser();
    const focusBlockSub = mdStore.subscribe((md: MdStore) => {
      if (md.blockToFocus === block.id && !isFocusing) {
        // console.log("focusing block check", {
        //   id,
        //   blockRef,
        //   context
        // });
        setCursorToEnd(blockRef);
      }
    });
    return () => {
      focusBlockSub();
    };
  });
  function hideBlockBrowser() {
    isRenderBlockBrowser = false;
    // blockBrowserRef.style.display = "none";
  }
  /**
   * Function to handle block browser related events
   */
  function handleBlockBrowser(
    event: KeyboardEvent,
    type: "keyup" | "keydown" = "keydown"
  ) {
    if (type === "keyup" && event.key === "/") {
      isRenderBlockBrowser = true;
      setTimeout(() => {
        console.log({ blockBrowserContainerRef, blockRef });
        renderPopoverv2(
          blockRef,
          blockBrowserContainerRef,
          Direction.BottomLeft
        );
      }, 100);
      return true;
    } else if (!isRenderBlockBrowser) {
      return false;
    } else if (
      type === "keyup" &&
      (event.key === "Escape" || !block.body.includes("/"))
    ) {
      hideBlockBrowser();
    } else if (
      type === "keydown" &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter")
    ) {
      blockBrowserRef.key(event.key);
      event.preventDefault();
    } else if (type === "keyup") {
      blockBrowserRef.filter(block.body);
    }
    return true;
  }

  function handleKeyDown(event: KeyboardEvent) {
    // console.log("keydown", event);
    const blockBrowserStatus = handleBlockBrowser(event);
    if (blockBrowserStatus) {
      return;
    }
    if (event.key === "Tab") {
      if (context === BlockContext.LIST_CHILD) {
        if (event.shiftKey === true) {
          dispatch("shifttab", block.id);
        } else {
          dispatch("tab", block.id);
          //mdStore.tabListItem(block.id);
        }
      }
      event.preventDefault();
    } else if (
      (event.key === "Enter" && event.metaKey == true) ||
      (event.key === "Enter" && isDirectInsertBlock && !event.shiftKey)
    ) {
      if (block.id && context === BlockContext.DEFAULT)
        mdStore.insert(block.id);
      else if (block.body != "") dispatch("insert", block.id);
      event.preventDefault();
    } else if (event.key === "Backspace" && !block.body) {
      if (block.id && context === BlockContext.DEFAULT)
        mdStore.deleteBlock(block.id);
      else dispatch("delete", block.id);
      event.preventDefault();
    }
  }

  function handleEscShortcutForSecondaryLines(
    shortcut: string,
    type: NodeType,
    listType?: ListType
  ) {
    if (
      block.type === NodeType.SIMPLE_TEXT &&
      caretPosition &&
      caretPosition.endContainer.nodeType === 3 &&
      caretPosition.endContainer.nodeValue &&
      caretPosition.endContainer.nodeValue.startsWith(shortcut)
    ) {
      //delete the parent <div> of the text node and insert new block with the type
      block.body = block.body.replace(shortcut, "");
      if (block.id) mdStore.insert(block.id, { blockType: type, listType });
      setTimeout(() => {
        let parent = undefined;
        if (block.id) parent = document.getElementById(block.id);
        // console.log("parent", parent, parent?.lastChild);
        if (parent && parent.lastChild) {
          parent.removeChild(parent.lastChild);
        }
      }, 10);
    }
  }
  function performEscapeShortcutsT2() {
    const textEscapeShortcuts: { shortcut: string; type: TextNodeType }[] = [
      { shortcut: "# ", type: NodeType.HEADING1 },
      { shortcut: "## ", type: NodeType.HEADING2 },
      { shortcut: "### ", type: NodeType.HEADING3 },
      { shortcut: "#### ", type: NodeType.HEADING4 },
      { shortcut: "##### ", type: NodeType.HEADING5 },
      { shortcut: '" ', type: NodeType.QUOTE }
    ];
    const structuralEscapeShortcuts = [
      { shortcut: "---", type: NodeType.DIVIDER },
      { shortcut: "===", type: NodeType.DOUBLE_DIVIDER }
    ];
    const listEscapeShortcuts = [
      { shortcut: "* ", listType: ListType.UNORDERED },
      { shortcut: "- ", listType: ListType.UNORDERED },
      { shortcut: "+ ", listType: ListType.UNORDERED },
      { shortcut: "1. ", listType: ListType.ORDERED }
    ];
    textEscapeShortcuts.forEach(({ shortcut, type }) => {
      if (typeof block.body !== "string") return;
      if (block.body.startsWith(shortcut)) {
        block.body = block.body.replace(shortcut, "");
        block.type = type;
      }
      handleEscShortcutForSecondaryLines(shortcut, type);
    });
    structuralEscapeShortcuts.forEach(({ shortcut, type }) => {
      if (typeof block.body !== "string") return;
      if (block.body === shortcut) {
        block.body = "";
        if (context != BlockContext.DEFAULT || !block.id) return;
        mdStore.insert(block.id, { blockType: type });
      }
    });
    listEscapeShortcuts.forEach(({ shortcut, listType }) => {
      if (typeof block.body !== "string") return;
      if (block.body.startsWith(shortcut)) {
        block.body = block.body.replace(shortcut, "");
        mdStore.convert(block.id!, { blockType: NodeType.LIST, listType });
      }
      handleEscShortcutForSecondaryLines(shortcut, NodeType.LIST, listType);
    });
  }

  //OBSELETE
  function performEscapeShortcutsT1() {
    if (typeof block.body !== "string") return;
    if (block.body.startsWith("# ")) {
      block.body = block.body.replace("# ", "");
      block.type = NodeType.HEADING1;
    } else if (block.body.startsWith("## ")) {
      block.body = block.body.replace("## ", "");
      block.type = NodeType.HEADING2;
    } else if (block.body.startsWith("### ")) {
      block.body = block.body.replace("### ", "");
      block.type = NodeType.HEADING3;
    } else if (block.body.startsWith("#### ")) {
      block.body = block.body.replace("#### ", "");
      block.type = NodeType.HEADING4;
    } else if (block.body.startsWith("##### ")) {
      block.body = block.body.replace("##### ", "");
      block.type = NodeType.HEADING5;
    } else if (block.body === "---") {
      block.body = "";
      if (context != BlockContext.DEFAULT || !block.id) return;
      mdStore.insert(block.id, { blockType: NodeType.DIVIDER });
    } else if (block.body === "===") {
      block.body = "";
      if (context != BlockContext.DEFAULT || !block.id) return;
      mdStore.insert(block.id, { blockType: NodeType.DOUBLE_DIVIDER });
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    // console.log("keyup", event);

    if (customCaret) {
      let rect = window?.getSelection()?.getRangeAt(0).getClientRects()[0];
      console.log({ caret: customCaret, rect });
      customCaret.style.left = rect?.x + "px";
      customCaret.style.top = rect?.y + "px";
    }
    setCaretPosition();
    const blockBrowserStatus = handleBlockBrowser(event, "keyup");
    if (blockBrowserStatus) {
      return;
    }
    //performEscapeShortcutsT1();
    performEscapeShortcutsT2();
    handleListContext();
    handleBackspaceAtBeginOfLine();
    if (
      event.key === "Backspace" &&
      block.type === NodeType.SIMPLE_TEXT &&
      block.body != "" &&
      caretPosition?.index === 0
    ) {
      if (block.id && context === BlockContext.DEFAULT)
        mdStore.focusPreviousSibling(block.id);
      else dispatch("delete", { id: block.id });
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
    /**
     * Function to handle backspace at the start of the block. Removes formatting of heading, quote, etc.
     */
    function handleBackspaceAtBeginOfLine() {
      if (
        event.key === "Backspace" &&
        block.type != NodeType.SIMPLE_TEXT &&
        block.body != "" &&
        caretPosition?.index === 0
      ) {
        block.type = NodeType.SIMPLE_TEXT;
      }
    }

    function handleListContext() {
      if (
        context === BlockContext.LIST_CHILD &&
        event.key === "Backspace" &&
        block.body === "" &&
        caretPosition?.index === 0
      ) {
        console.log("converting to simple text");
        mdStore.convert(block.id!, { blockType: NodeType.SIMPLE_TEXT });
      }
    }
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
      if (typeof block.body !== "string") return;
      const matches = block.body.match(regex);
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
          block.body = block.body.replace(
            regex,
            replacement + `<span id="${focusedSpan}">&#8203;</span>`
          );
          // console.log("new span inserted", focusedSpan);
          // setCursorToSpan(document.getElementById(focusedSpan));
          // return;
        } else {
          setCaretPosition();
          block.body = block.body.replace(regex, replacement);
        }

        // console.log("caretPosition", caretPosition);
        //block.body = block.body.replace(regex, replacement);
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
    if (typeof block.body !== "string") return;
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
    // block.body = block.body
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
  async function handlePaste(event: ClipboardEvent) {
    const items = event?.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("text") === 0) {
        console.log("Text is being pasted");
      } else if (items[i].type.indexOf("image") === 0) {
        console.log("Image is being pasted");
        const blob = items[i].getAsFile();
        if (!blob) return;
        let image;
        let reader = new FileReader();
        reader.onload = async (e) => {
          // console.log(
          //   "length: ",
          //   e.target?.result?.includes("data:image/jpeg")
          // );
          // if (!e.target.result.includes("data:image/jpeg")) {
          //   return alert("Wrong file type - JPG only.");
          // }
          // if (e.target.result.length > MAX_IMAGE_SIZE) {
          //   return alert("Image is loo large.");
          // }
          image = e.target?.result;
          await uploadImage(image);
        };
        reader.readAsDataURL(blob);
      }
    }
    event.preventDefault();
  }
  async function uploadImage(image: any) {
    const signedUrl =
      "https://testtidyuserbucketthree.s3.ap-south-2.amazonaws.com/xyz/image/3ce5fefd-81a9-4238-9560-83755202c0e7_sample.jpeg?Content-Type=image%2Fjpeg&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAXLCVEUWSBWDSDV6G%2F20240116%2Fap-south-2%2Fs3%2Faws4_request&X-Amz-Date=20240116T160522Z&X-Amz-Expires=3000&X-Amz-Signature=ba01b9a17f36c821cf15a18034d554528245c1158ca4b1a9064c5129ef97f8f4&X-Amz-SignedHeaders=host%3Bx-amz-acl&x-amz-acl=public-read";
    if (!image) return;
    let binary = atob(image.split(",")[1]);
    let array = [];
    for (var j = 0; j < binary.length; j++) {
      array.push(binary.charCodeAt(j));
    }
    let blobData = new Blob([new Uint8Array(array)], {
      type: "image/jpeg"
    });
    const result = await fetch(signedUrl, {
      method: "PUT",
      body: blobData
    });
    console.log("result", result);
    if (result.status === 200) {
      block.body = block.body + `<img src="${signedUrl}"/>`;
    }
  }
  function assignPlaceholder() {
    placeholder = blockSpecificPlaceholder ?? defaultPlaceholder;
  }

  function onBlockSelect(event: CustomEvent) {
    console.log("onBlockSelect", event.detail);
    if (block.id) mdStore.convert(block.id, { blockType: event.detail.type });
    hideBlockBrowser();
  }
</script>

{#if typeof block.body === "string"}
  <div class="relative">
    {#if $mdStore.params?.isReadOnly || !$isInEditMode}
      <div
        id={block.id}
        style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
        class="w-full h-full outline-none py-2 {sizing} {block.type ===
        NodeType.QUOTE
          ? 'px-2'
          : 'px-1'}"
      >
        {@html block.body}
      </div>
    {:else}
      <div
        bind:this={blockRef}
        id={block.id}
        style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
        class="relative w-full h-full outline-none py-2 {sizing} {block.type ===
        NodeType.QUOTE
          ? 'px-2'
          : 'px-1'}"
        on:keyup={handleKeyUp}
        on:keydown={handleKeyDown}
        on:keypress={handleKeyPress}
        on:mouseup={handleMouseup}
        bind:innerHTML={block.body}
        on:pointerenter
        on:pointerleave
        on:blur={() => {
          isFocusing = false;
          placeholder = "";
          dispatch("blur");
        }}
        on:focus={() => {
          // console.log("focusing", id);
          isFocusing = true;
          assignPlaceholder();
        }}
        contenteditable
        {placeholder}
      ></div>
      {#if isCustomCaret}
        <div id="customcaret" class="w-2 h-2 bg-aps1"></div>
      {/if}
      <!--         on:paste={handlePaste} -->
    {/if}
    {#if block.type === NodeType.QUOTE}
      <div class="absolute top-0 left-0 h-full w-0.5 bg-a1"></div>
    {/if}
  </div>

  <!-- {:else if Array.isArray(block.content)} -->
{:else if spans.length > 0}
  <div contenteditable class="outline-none">
    <TextWithSpans content={spans} />
  </div>
{/if}
{#if !block.body && !$mdStore.params?.isReadOnly}
  <!-- <button
    on:click={() => {
      blockRef.focus();
    }}
    class="absolute top-0 left-0 cursor-text py-2 {sizing} {blockSpecificPlaceholder
      ? 'text-bgs4'
      : 'text-fgs3 ml-1'} {block.type === MdBlockType.QUOTE
      ? 'px-2'
      : 'px-1'}"
  >
    {blockSpecificPlaceholder ?? defaultPlaceholder}
  </button> -->
{/if}

{#if isRenderBlockBrowser}
  <div bind:this={blockBrowserContainerRef}>
    <BlockBrowser bind:this={blockBrowserRef} on:select={onBlockSelect} />
  </div>
{/if}

<style>
  div[contenteditable] {
    caret-color: rgba(var(--colors-aps1), 1) !important;
  }
  div[contenteditable].customcaret {
    /* caret-color: rgba(var(--colors-aps1), 1) !important; */
    caret-color: transparent;
  }
  div[contenteditable]:empty::after {
    content: attr(placeholder);
    color: rgba(var(--colors-fgs3), 1);
  }
  [contenteditable]::selection {
    background-color: rgba(var(--colors-aps1), 0.3);
  }
  #customcaret {
    position: fixed;
    height: 22px;
    width: 3px;
    background-color: rgba(var(--colors-aps1), 1);
    animation: blink 1s steps(5, start) infinite;
  }

  @keyframes blink {
    to {
      visibility: hidden;
    }
  }
</style>
