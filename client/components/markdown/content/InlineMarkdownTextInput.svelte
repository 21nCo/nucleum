<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import {
    type SpanContent,
    SpanType
  } from "$lib/client/components/markdown/md.type";
  import TextWithSpans from "./TextWithSpans.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import {
    extractInlineMarkdownFromHtml,
    findInlineStylingPatterns,
    findSymbolPatterns,
    replaceInlineStylePatterns,
    replaceSymbolPatterns
  } from "../markdown.utils";
  import InlineMention from "./InlineMention.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { logger } from "../../debug/logger.client";
  import { scrollIntoViewOnFocus } from "$lib/client/actions/scroll.action";
  const dispatch = createEventDispatcher();
  //   export let block: Block<TextContent>;
  export let id: string = generateUID();
  export let content: string | undefined = "";
  export let placeholder: string | undefined = "";
  export let isMarkdown: boolean = false;
  export let isPreventDefaultOnEnter: boolean = false;
  let classList: string = "";
  export { classList as class };
  let blockRef: any;

  enum InlineCaretResolutionMethod {
    T1 = "t1",
    T2 = "t2",
    /**
     * Current node is scoped for checking the patterns and replacing them.
     * Each newly inserted span node will have an id to track the caret position
     */
    CURRENT_NODE_SCOPED_REPLACE = "currentnodescopedreplace",
    /**
     * Uses the data-index attribute to store the index of the node wrt the parent element and then to restore the caret position
     */
    DATA_INDEX_ATTRIBUTE = "dataindexattribute",
    CURRENT_NODE_UNSCOPED = "currentnodeid"
  }
  let inlineCaretResolutionMethod: InlineCaretResolutionMethod =
    InlineCaretResolutionMethod.CURRENT_NODE_UNSCOPED;
  /**
   * Sets a custom caret style hiding the default caret
   * Notes:
   * The custom caret implementation needs more work to handle all cases
   * 1. When clicking in any other text boxes like title or forelink etc. the custom caret should be hidden
   * 2. Due to the width of the caret, when clicked in between texts, it is hiding the next character
   * 3. When selecting text, the custom caret is not being hidden
   *
   */
  let isCustomCaret = false;
  let customCaret: HTMLElement | null = null;
  let typing: boolean = false;
  let typingTimeout: any;
  let innerHTML: string;

  let newInlineSpanId: string;
  let caretPositionT2:
    | {
        element?: any;
        parent?: any;
        elementIndex?: number;
        index: number;
        elementId?: string;
        endContainer?: any;
      }
    | undefined = undefined;
  let caretPositionUsingCurrentNodeAndParentId: {
    currentNodeParentId: string;
    currentNodeIndex: number;
    offset: number;
  };
  let caretPositionT1: number | undefined = undefined;
  let markerId = "caret-marker";
  let isNewSpanInserted = false;
  /**
   * @deprecated
   * @param text
   */
  let spans: SpanContent[] =
    typeof content === "string" ? parseSpansFromText(content) : [];
  // replaceInlineStyling();

  onMount(() => {
    customCaret = document.getElementById("customcaret");
    innerHTML = content ? replaceInlineStylePatterns(content) : "";
    renderMentionPlaceholders();
    setTimeout(() => {
      renderMentions(true);
    }, 10);
  });

  function renderMentionPlaceholders() {
    const regex = /\[(.*?)\]\(resource=(.*?)\)/g;
    innerHTML = innerHTML.replace(
      regex,
      (match, p1, p2) => `<mention data-id='${p2}'></mention>`
    );
  }
  export function focus(offset: number = 0) {
    logger.log({ at: "focus", offset });
    const element = blockRef;
    if (!element) return;
    // element?.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function focusv2(params?: { xOffset?: number; isBottom?: boolean }) {
    const newPosition = getClosestPosition(
      blockRef,
      params?.xOffset,
      params?.isBottom
    );
    const selection = window.getSelection();

    const newRange = document.createRange();
    newRange.setStart(newPosition.node, newPosition.offset);
    newRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(newRange);

    function getClosestPosition(element, targetX, isTop) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      let closestNode = null;
      let closestOffset = 0;
      let minDiff = Infinity;

      while (node) {
        const range = document.createRange();
        for (let i = 0; i <= node.length; i++) {
          range.setStart(node, i);
          range.setEnd(node, i);
          const rect = range.getBoundingClientRect();

          // Check if this position is in the first (for ArrowUp) or last (for ArrowDown) line
          if (
            (isTop && rect.top === element.getBoundingClientRect().top) ||
            (!isTop && rect.bottom === element.getBoundingClientRect().bottom)
          ) {
            const diff = Math.abs(rect.left - targetX);
            if (diff < minDiff) {
              minDiff = diff;
              closestNode = node;
              closestOffset = i;
            }
          }
        }
        node = walker.nextNode();
      }

      return { node: closestNode, offset: closestOffset };
    }
  }

  export function replace(target: string, replacement: string) {
    innerHTML = innerHTML.replace(target, replacement);
  }
  export function addMention(item: any, searchQuery: string) {
    console.log("addMention - start", { item, content, innerHTML });
    content = content?.replace(
      "@" + searchQuery,
      `[${item.label}](resource=${item.id})`
    );
    innerHTML = innerHTML.replace(
      "@" + searchQuery,
      `<mention data-id='${item.id}'></mention>`
    );
    console.log("addMention - after adding placeholder", {
      searchQuery,
      content,
      innerHTML
    });
    setTimeout(() => {
      renderMentions();
    }, 10);
    // refreshMentions();
  }
  export function set(content: string) {
    innerHTML = content;
  }
  export function removeSlashText() {
    innerHTML = innerHTML.split("/")[0];
    content = blockRef.textContent;
    dispatch("change", content);
  }
  export function addCharacter(character: string) {
    innerHTML = innerHTML + character;
    content = blockRef.textContent;
    dispatch("change", content);
  }

  /**
   * @deprecated
   */
  export function renderMentionsv1() {
    const mentions = document.querySelectorAll("mention");
    document.querySelectorAll("mention").forEach((el) => {
      const id = el.getAttribute("data-id") ? el.getAttribute("data-id") : "";
      new InlineMention({ target: el, props: { id } });

      // Restore the caret position
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStartAfter(el);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    });
  }
  export function renderMentions(isInitialRender: boolean = false) {
    const container = document.getElementById(id);
    if (!container) return;
    const mentions = container.querySelectorAll("mention");
    mentions.forEach((el) => {
      const id = el.getAttribute("data-id") ? el.getAttribute("data-id") : "";
      const placeholder = document.createElement("div");
      const inlineMention = new InlineMention({
        target: placeholder,
        props: { id: id ?? "" }
      });
      if (isInitialRender) {
        el.replaceWith(...placeholder.childNodes);
        return;
      }
      newInlineSpanId = generateUID();
      caretPositionT2 = {
        ...caretPositionT2,
        index: caretPositionT2?.index ?? 0,
        elementId: newInlineSpanId
      };
      let newSpan = document.createElement("span");
      newSpan.id = newInlineSpanId;
      newSpan.innerHTML = "&#8203;";
      placeholder.appendChild(newSpan);
      el.replaceWith(...placeholder.childNodes);
      restoreCaretPosition();
    });
  }

  /**
   * ! Deprecated
   * T1 method of inline fragment
   */
  function parseSpansFromText(text: string) {
    let spans: SpanContent[] = [];
    return spans;
  }

  /**
   * ! Deprecated
   * T1 of having fragments for inline formatting
   * @param match
   */
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

  /**
   * @deprecated
   * T1 of saving caret position
   */
  function insertCaretMarker() {
    const caretPosition = getCursorPosition(blockRef);
    if (typeof content !== "string") return;
    content =
      content.slice(0, caretPosition) +
      "<!--caret-->" +
      content.slice(caretPosition);

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
  }

  /**
   * Sets the custom caret position
   */
  function setCustomCaretPosition() {
    if (!customCaret) return;
    let rect = window?.getSelection()?.getRangeAt(0).getClientRects()[0];
    customCaret.style.left = rect?.x + "px";
    customCaret.style.top = rect?.y + "px";
  }

  function saveCaretPositionT2() {
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
    caretPositionT2 = {
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

  function saveCaretPositionUsingCurrentNode() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const nodeParent = range.startContainer.parentNode;
      const node = range.startContainer;
      if (nodeParent && nodeParent instanceof HTMLElement) {
        if (
          inlineCaretResolutionMethod ===
            InlineCaretResolutionMethod.CURRENT_NODE_SCOPED_REPLACE ||
          inlineCaretResolutionMethod ===
            InlineCaretResolutionMethod.CURRENT_NODE_UNSCOPED
        ) {
          caretPositionUsingCurrentNodeAndParentId = {
            currentNodeParentId: nodeParent.id,
            currentNodeIndex: Array.from(nodeParent?.childNodes).findIndex(
              (child: ChildNode) => (child as Element) === node
            ),
            offset: range.startOffset
          };
        }
      }
    }
  }

  function saveCaretPosition() {
    if (inlineCaretResolutionMethod === InlineCaretResolutionMethod.T1) {
      // saveCaretPositionT1();
    } else if (inlineCaretResolutionMethod === InlineCaretResolutionMethod.T2) {
      return saveCaretPositionT2();
    } else if (
      inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.CURRENT_NODE_SCOPED_REPLACE ||
      inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.CURRENT_NODE_UNSCOPED
    ) {
      saveCaretPositionUsingCurrentNode();
      saveCaretPositionT2();
    } else if (
      inlineCaretResolutionMethod ===
      InlineCaretResolutionMethod.DATA_INDEX_ATTRIBUTE
    ) {
      //saveCaretPositionUsingDataIndexAttribute();
    }
  }

  function restoreCaretPositionForSymbolUsingCurrentNode() {
    if (!caretPositionUsingCurrentNodeAndParentId) return;
    const parent = document.getElementById(
      caretPositionUsingCurrentNodeAndParentId.currentNodeParentId
    );
    if (!parent) return;
    const node =
      parent.childNodes[
        caretPositionUsingCurrentNodeAndParentId.currentNodeIndex
      ];
    if (!node) return;
    try {
      const range = document.createRange();
      const selection = window.getSelection();
      range.setStart(node, caretPositionUsingCurrentNodeAndParentId.offset - 1);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch (error) {
      console.error("restoring caret errored", error);
    }
  }
  /**
   * @deprecated
   * Restore cursor position using comment marker
   */
  function restoreCursorPosition() {
    if (typeof content !== "string" || !blockRef) return;
    // console.log("restoreCursorPosition");
    //const index = block.block.indexOf("<!--caret-->");
    const index = caretPositionT2?.index ?? -1;
    if (index !== -1) {
      // const range = document.createRange();
      // const sel = window.getSelection();
      // range.setStart(blockRef, index);
      // range.collapse(true);
      // sel?.removeAllRanges();
      // sel?.addRange(range);
      //setCursorPosition(blockRef, index);
      // const ele = document.getElementById(caretPosition?.element ?? "");
      if (!caretPositionT2?.element) return;
      restoreCaretPositionv1(caretPositionT2?.element, index);
    }
    content = content.replace("<!--caret-->", "");
  }

  /**
   * Selects the node
   */
  function selectNode(node: any) {
    const range = document.createRange();
    range.selectNodeContents(node);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  function restoreCaretPosition(isSymbol: boolean = false) {
    setTimeout(() => {
      if (inlineCaretResolutionMethod === InlineCaretResolutionMethod.T1) {
        // restoreCursorPositionT1();
      } else if (
        inlineCaretResolutionMethod === InlineCaretResolutionMethod.T2 ||
        inlineCaretResolutionMethod ===
          InlineCaretResolutionMethod.CURRENT_NODE_SCOPED_REPLACE
      ) {
        if (isSymbol) {
          restoreCaretPositionT2();
        } else {
          // restoreCaretPositionT2();
          restoreCaretPositionToNewSpan();
        }
      } else if (
        inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.DATA_INDEX_ATTRIBUTE
      ) {
        throw new Error("Method not implemented.");
      } else if (
        inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.CURRENT_NODE_UNSCOPED
      ) {
        if (isSymbol) {
          restoreCaretPositionForSymbolUsingCurrentNode();
        } else {
          restoreCaretPositionToNewSpan();
        }
      }
    }, 10);
  }
  function restoreCaretPositionT2() {
    if (!caretPositionT2) return;
    const range = document.createRange();
    const selection = window.getSelection();
    try {
      if (isNewSpanInserted && caretPositionT2.elementIndex != undefined) {
        const parent = document.getElementById(caretPositionT2.parent.id);
        if (!parent?.childNodes) return;
        // const node = parent
        //   ? parent?.childNodes[caretPosition.elementIndex + 1]
        //   : caretPosition.parent.childNodes[caretPosition.elementIndex + 1];
        // const node = document.getElementById(caretPosition.elementId);
        // setCursorToEnd(node);
        const node = Array.from(parent?.childNodes).find(
          (node: ChildNode) =>
            (node as Element).id === caretPositionT2?.elementId
        );
        if (node) range.setStart(node, 1);
      } else if (caretPositionT2.elementIndex != undefined) {
        let node = caretPositionT2.element;
        const parent = document.getElementById(caretPositionT2.parent.id);
        node = parent
          ? parent?.childNodes[caretPositionT2.elementIndex]
          : caretPositionT2.parent.childNodes[caretPositionT2.elementIndex];
        range.setStart(
          node,
          caretPositionT2.index === 0 ? 0 : caretPositionT2.index - 1
        );
      }
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch (error) {
      console.error("restoring caret errored", error);
    }
  }
  /**
   * Restores caret position to the new span element created right next to the inline style that got created by using pattern detection
   *
   * Replace 1 with 0 at setStart() if auto space is disabled
   */
  function restoreCaretPositionToNewSpan() {
    const el = document.getElementById(newInlineSpanId);
    if (el) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(el, 1);
      range.collapse(true);
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      console.error(
        "Restoring caret position to new span failed. element with this ID does not exist."
      );
    }
  }

  /**
   * @deprecated
   * @param element
   * @param index
   */
  function restoreCaretPositionv1(element: any, index: any) {
    const selection = window.getSelection();
    const range = document.createRange();
    selection?.removeAllRanges();
    let currentLength = 0;
    let found = false;
    // Recursive function to walk through child nodes
    function setRange(node: any) {
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
        restoreCaretPositionv1(element, 0);
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    clearTimeout(typingTimeout);
    typing = true;
    if (isMarkdown) {
      const position = resolveCaretPosition();
      // const position2 = checkCaretPositionv2();
      dispatch("keydown", {
        event,
        position
        // position2
      });
    } else if (isPreventDefaultOnEnter && event.key === "Enter") {
      event.preventDefault();
      dispatch("enter", { event });
    } else {
      //TODO - test functioning of enter, backspace etc
    }
  }

  function isFirstLine() {
    const selection = window.getSelection();
    if (selection?.rangeCount === 0 || !selection) return;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(blockRef);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const caretRect = range.getBoundingClientRect();
    const editableRect = blockRef.getBoundingClientRect();

    const lineHeight = parseInt(window.getComputedStyle(blockRef).lineHeight);
    return caretRect.top - editableRect.top < lineHeight;
  }

  /**
   * Resolves the caret position within a block of text.
   */
  function resolveCaretPosition() {
    const selection = window.getSelection();
    if (selection?.rangeCount === 0 || !selection) return;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(blockRef);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const caretRect = range.getBoundingClientRect();
    const editableRect = blockRef.getBoundingClientRect();

    const lineHeight = parseInt(window.getComputedStyle(blockRef).lineHeight);
    let isFirstLine = caretRect.top - editableRect.top < lineHeight;

    const caretBottom = caretRect.bottom;
    const editableBottom = editableRect.bottom;
    let isLastLine = editableBottom - caretBottom < lineHeight;
    // logger.log({
    //   lineHeight,
    //   caretBottom,
    //   editableBottom,
    //   caretRect,
    //   editableRect,
    //   isFirstLine,
    //   isLastLine
    // });
    if (caretRect.top === 0 && caretRect.bottom === 0) {
      isFirstLine = true;
      isLastLine = true;
    }

    const totalOffset = getCaretCharacterOffsetWithin(blockRef);
    let caretOffset = getLineStartOffset(blockRef, totalOffset);

    return { isFirstLine, isLastLine, caretOffset };

    function getCaretCharacterOffsetWithin(element) {
      let caretOffset = 0;
      const doc = element.ownerDocument || element.document;
      const win = doc.defaultView || doc.parentWindow;
      let sel;
      if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
          let range = win.getSelection().getRangeAt(0);
          let preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(element);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          caretOffset = preCaretRange.toString().length;
        }
      } else if ((sel = doc.selection) && sel.type != "Control") {
        let textRange = sel.createRange();
        let preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
      }
      return caretOffset;
    }

    function getLineStartOffset(element, caretOffset) {
      const text = element.textContent;
      let lineStart = caretOffset;
      while (lineStart > 0 && text[lineStart - 1] !== "\n") {
        lineStart--;
      }
      return caretOffset - lineStart;
    }
  }

  function checkCaretPositionv2() {
    const selection = window.getSelection();
    if (selection?.rangeCount === 0 || !selection) return;

    const range = selection.getRangeAt(0);
    const caretRect = range.getBoundingClientRect();
    const editableRect = blockRef.getBoundingClientRect();

    const lines = getLines(blockRef);
    const currentLineIndex = lines.findIndex(
      (line) => line.top <= caretRect.top && line.bottom >= caretRect.top
    );

    const isFirstLine = currentLineIndex === 0;
    const isLastLine = currentLineIndex === lines.length - 1;

    const currentLine = lines[currentLineIndex];
    const caretOffset = caretRect?.left - currentLine?.left;

    return { isFirstLine, isLastLine, caretOffset };

    function getLines(element) {
      const lines = [];
      const traverse = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const rects = range.getClientRects();
          for (let i = 0; i < rects.length; i++) {
            lines.push({
              top: rects[i].top,
              bottom: rects[i].bottom,
              left: rects[i].left,
              right: rects[i].right
            });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "DIV" && node !== element) {
            const rect = node.getBoundingClientRect();
            lines.push({
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right
            });
          } else {
            for (let child of node.childNodes) {
              traverse(child);
            }
          }
        }
      };
      traverse(element);
      return lines.sort((a, b) => a.top - b.top);
    }
  }

  /**
   * Handles keyup event to perform various actions like escape shortcuts, symbol and inline shortcut formatting, backspace event etc.
   *
   * 1. Sets the caret position so that events like backspace at the start of the block can be handled
   * 2. Delegates block browser shortcut handling, Escape shortcut handling, list contextual actions, backspace at the start of the block, symbol replacement, inline styling replacement
   *
   * Note: Chaging the sequence of the operation can lead to unexpected behaviour
   *
   * @param event
   */
  function handleKeyUp(event: KeyboardEvent) {
    const parsedMdContent = extractInlineMarkdownFromHtml(blockRef.innerHTML);
    // console.log("keyup", {
    //   event,
    //   textContent: deepCopy(blockRef.textContent),
    //   parsedMdContent
    // });
    saveCaretPosition();
    content = parsedMdContent ?? "";
    dispatch("change");
    const steps = [replaceInlineSymbols, () => replaceInlineStyling(event)];
    for (const func of steps) {
      if (func()) return;
    }
    if (isMarkdown) {
      const position = resolveCaretPosition();
      dispatch("keyup", {
        event,
        caretPosition: caretPositionT2?.index,
        position
      });
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typing = false;
    }, 10);
    /**
     * Replaces symbol shortcut patterns with the symbols
     */
    function replaceInlineSymbols() {
      const matches = findSymbolPatterns(innerHTML);
      if (!matches || !(matches.length > 0)) return false;
      innerHTML = replaceSymbolPatterns(innerHTML);
      restoreCaretPosition(true);
      return true;
    }
  }

  /**
   * Replaces inline styling patterns with the respective HTML tags
   * @param event - Keyboard event
   */
  function replaceInlineStyling(event: KeyboardEvent) {
    if (
      event.key === "Backspace" ||
      !(
        event.key === "*" ||
        event.key === "_" ||
        event.key === "`" ||
        event.key === "~"
      )
    ) {
      return false;
    }
    const parent = document.getElementById(
      caretPositionUsingCurrentNodeAndParentId?.currentNodeParentId
    );
    const currentNodeReinitUsingParent =
      parent?.childNodes[
        caretPositionUsingCurrentNodeAndParentId?.currentNodeIndex
      ];
    const currentNodeContent = currentNodeReinitUsingParent?.textContent;
    let matches;
    if (
      inlineCaretResolutionMethod === InlineCaretResolutionMethod.T1 ||
      inlineCaretResolutionMethod === InlineCaretResolutionMethod.T2 ||
      inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.DATA_INDEX_ATTRIBUTE ||
      inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.CURRENT_NODE_UNSCOPED
    ) {
      matches = findInlineStylingPatterns(innerHTML);
    } else if (
      currentNodeContent &&
      inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.CURRENT_NODE_SCOPED_REPLACE
    ) {
      matches = findInlineStylingPatterns(currentNodeContent);
    }
    if (!matches || !(matches.length > 0)) return false;
    matches.forEach(({ match, pattern }) => {
      newInlineSpanId = generateUID();
      isNewSpanInserted = true;
      const replacementWithNewSpan =
        pattern.replacement + `<span id="${newInlineSpanId}">&nbsp;</span>`;
      if (inlineCaretResolutionMethod === InlineCaretResolutionMethod.T2) {
        // if (typeof content !== "string") return;
        caretPositionT2 = {
          ...caretPositionT2,
          index: caretPositionT2?.index ?? 0,
          elementId: newInlineSpanId
        };
        innerHTML = innerHTML.replace(pattern.regex, replacementWithNewSpan);
      } else if (
        inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.CURRENT_NODE_SCOPED_REPLACE
      ) {
        if (!currentNodeContent || !currentNodeReinitUsingParent) return;
        // (currentNodeReinitUsingParent as HTMLElement).innerHTML = currentNodeContent.replace(
        //   pattern.regex,
        //   replacementWithNewSpan
        // );
        const newNode = document.createElement("span");
        newNode.id = generateUID();
        newNode.innerHTML = currentNodeContent.replace(
          pattern.regex,
          replacementWithNewSpan
        );
        parent.replaceChild(newNode, currentNodeReinitUsingParent);
      } else if (
        inlineCaretResolutionMethod ===
        InlineCaretResolutionMethod.CURRENT_NODE_UNSCOPED
      ) {
        //replace innerHTML part of the pattern with a new span with id
        const newNode = document.createElement("span");
        newNode.id = generateUID();
        newNode.innerHTML = match[0].replace(
          pattern.regex,
          replacementWithNewSpan
        );
        innerHTML = innerHTML.replace(match[0], newNode.outerHTML);
      }
      restoreCaretPosition();
      isNewSpanInserted = false;
    });
    return true;
  }

  function handleKeyPress(event: any) {
    // console.log("keypress", event, block);
  }
  function handleMouseup(event: any) {
    saveCaretPosition();
    setCustomCaretPosition();
    // console.log("mouseup", event, block);
  }
  function handleMouseDown(event: any) {
    // console.log("mousedown", event, block);
  }
  async function handlePaste(event: ClipboardEvent) {
    if (isMarkdown) {
      //TODO - relay paste event
    } else {
      //TODO - test paste functionality
    }
  }
  /**
   * oninput event handler
   *
   * 1. Sets the custom caret position
   * 2. Handles the case when the content is empty but a <br> tag is being inserted by some browsers (which is making placeholder to not become visible - as :empty::after is used to show placeholder)
   *
   * saveCaretPosition() - is moved to keyup event - since input event is not triggered for the case when the user moves the placement of the caret using arrow keys
   * @param event
   */
  function oninput(event: any) {
    setCustomCaretPosition();
    if (event.target.innerHTML === "<br>" || event.target.innerHTML === "") {
      event.target.innerHTML = "";
    }
    dispatch("input", event);
  }
</script>

{#if typeof content === "string"}
  <div class="relative w-full">
    <div
      bind:this={blockRef}
      {id}
      style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
      class={cn(
        "inline-markdown relative w-full h-full text-left outline-none py-2",
        classList,
        {
          customcaret: isCustomCaret,
          noncustomcaret: !isCustomCaret,
          typing: typing,
          nontyping: !typing
        }
      )}
      on:keyup={handleKeyUp}
      on:keydown={handleKeyDown}
      on:keypress={handleKeyPress}
      on:input={oninput}
      on:mouseup={handleMouseup}
      on:mousedown={handleMouseDown}
      on:paste={handlePaste}
      on:blur
      on:focus
      on:pointerenter
      on:pointerleave
      bind:innerHTML
      contenteditable
      {placeholder}
      use:scrollIntoViewOnFocus={{
        behavior: "auto",
        block: "center",
        eager: {
          bottom: 60
        }
      }}
    ></div>
    {#if isCustomCaret}
      <div
        id="customcaret"
        class="bar w-2 h-2 bg-aps1 {typing ? 'typing' : 'nontyping'}"
      ></div>
    {/if}
  </div>
  <!-- {:else if Array.isArray(block.content)} -->
{:else if spans.length > 0}
  <div contenteditable class="outline-none">
    <TextWithSpans content={spans} />
  </div>
{/if}

<style>
  div[contenteditable].noncustomcaret {
    caret-color: rgba(var(--colors-aps1), 1) !important;
    caret-shape: block;
  }
  div[contenteditable].customcaret {
    caret-color: transparent;
  }

  div[contenteditable]:empty::after {
    content: attr(placeholder);
    color: rgba(var(--colors-fgs2), 0.5);
  }
  [contenteditable]::selection {
    background-color: rgba(var(--colors-aps1), 0.3);
  }
  #customcaret {
    position: fixed;
    height: 22px;
    width: 3px;
    background-color: rgba(var(--colors-aps1), 1);
  }
  #customcaret.nontyping {
    animation: blink 1s steps(5, start) infinite;
  }

  @keyframes blink {
    to {
      visibility: hidden;
    }
  }
</style>
