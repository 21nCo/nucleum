<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { type IBlock, InlineType } from "@21n/components/markdown/md.type";
  import { debouncer, generateUID } from "@21n/utils/utils";
  import {
    extractInlineMarkdownFromHtml,
    findInlineStylingPatterns,
    findSymbolPatterns,
    inlineLinkPatterns,
    replaceInlineStylePatterns,
    replaceSymbolPatterns
  } from "@21n/components/markdown/markdown.utils";
  import InlineMention from "@21n/components/markdown/content/inline/InlineMention.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { logger } from "@21n/components/debug/logger.client";
  import { scrollIntoViewOnFocus } from "@21n/actions/scroll.action";
  import { isValidString, truncateString } from "@21n/shared-utils/text.utils";
  import { resolveNodeLabelString } from "@21n/products/memotron/node/node.utils";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import InlineLink from "@21n/components/markdown/content/inline/InlineLink.svelte";
  import { resolvePasteContents } from "@21n/products/memotron/capture/capture.utils";
  import { MAX_FILE_SIZE_MB } from "@21n/components/record/record.store";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  import view from "@21n/stores/view.store";
  import KeyboardToolbar from "@21n/elements/keyboardToolbar/KeyboardToolbar.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { Size } from "@21n/types/size.enum";

  const dispatch = createEventDispatcher();
  //   export let block: Block<TextContent>;
  export let id: string = generateUID();
  export let dataType: string = "";
  export let content: string | undefined = "";
  export let placeholder: string | undefined = "";
  export let isMarkdown: boolean = false;
  export let isReadOnly: boolean = false;
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
  let isNewSpanInserted = false;

  // replaceInlineStyling();

  let mutationObserver: MutationObserver;
  let isKeyboardInput = false;
  let keyboardTimeout: any;
  let isInitialRender = true;

  onMount(() => {
    customCaret = document.getElementById("customcaret");
    innerHTML = content ? replaceInlineStylePatterns(content) : "";
    renderMentionPlaceholders();
    const hasLinks = renderInlineLinkPlaceholders();
    setTimeout(() => {
      renderMentions(true);
      if (hasLinks) renderInlineLinks(true);
      isInitialRender = false;
    }, 10);

    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          (mutation.type === "characterData" ||
            mutation.type === "childList") &&
          !isKeyboardInput &&
          !isInitialRender
        ) {
          const parsedMdContent = extractInlineMarkdownFromHtml(
            blockRef.innerHTML
          );
          content = parsedMdContent ?? "";
          dispatchChangeEvent();
        }
      });
    });

    if (blockRef) {
      mutationObserver.observe(blockRef, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
  });

  onDestroy(() => {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
  });

  function renderMentionPlaceholders() {
    const pattern = inlineLinkPatterns.find(
      (pattern) => pattern.type === InlineType.MENTION
    );
    if (!pattern) return;
    innerHTML = innerHTML.replace(pattern.regex, pattern.replacement);
  }

  function renderInlineLinkPlaceholders(isNewInsert?: boolean) {
    const pattern = inlineLinkPatterns.find(
      (pattern) => pattern.type === InlineType.LINK
    );
    if (!pattern) return;
    if (isNewInsert) {
      innerHTML = blockRef.innerHTML;
    }
    const matches = pattern.regex.exec(innerHTML);
    if (!matches) return;
    innerHTML = innerHTML.replace(pattern.regex, pattern.replacement);
    return true;
  }

  /**
   * @deprecated - use renderInlineLinkPlaceholders + renderInlineLinks instead
   */
  function renderInlineLinksv1() {
    console.log("renderInlineLinks", innerHTML);
    const inlineLinkPattern = inlineLinkPatterns.find(
      (pattern) => pattern.type === InlineType.LINK
    );
    if (inlineLinkPattern) {
      const matches = inlineLinkPattern.regex.exec(innerHTML);
      if (matches) {
        newInlineSpanId = generateSimpleRandomId();
        innerHTML = innerHTML.replace(
          inlineLinkPattern.regex,
          inlineLinkPattern.replacement +
            `<span id="${newInlineSpanId}">&#8203;</span>`
        );
        return true;
      }
    }
    return false;
  }
  export function focus(params?: { xOffset?: number; isBottom?: boolean }) {
    logger.log({ at: "InlineMarkdownTextInput - focus", params, id });
    const element = blockRef;
    if (!element) return;
    const isOffsetGreaterThanLength =
      params?.xOffset && params?.xOffset > element.textContent?.length;
    if (
      params?.xOffset &&
      typeof params?.xOffset === "number" &&
      params?.xOffset !== 0 &&
      !isOffsetGreaterThanLength
    ) {
      setCaretPosition(element, params.xOffset);
    } else {
      const range = document.createRange();
      range.selectNodeContents(element);
      const isAtStart =
        (params?.xOffset === 0 || !params?.isBottom) &&
        !isOffsetGreaterThanLength;
      range.collapse(isAtStart);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  function setCaretPosition(element: HTMLElement, offset: number) {
    const range = document.createRange();
    const selection = window.getSelection();
    let charCount = 0;
    let nodeFound = false;

    function traverseNodes(node: Node) {
      if (node.nodeType === Node.TEXT_NODE && !nodeFound) {
        const text = node.textContent || "";
        const nextCharCount = charCount + text.length;
        if (offset >= charCount && offset <= nextCharCount) {
          range.setStart(node, offset - charCount);
          range.collapse(true);
          nodeFound = true;
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        charCount = nextCharCount;
      } else if (!nodeFound) {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverseNodes(node.childNodes[i]);
          if (nodeFound) {
            break;
          }
        }
      }
    }

    traverseNodes(element);
  }

  export function replace(target: string, replacement: string) {
    innerHTML = innerHTML.replace(target, replacement);
  }
  export function addMention(
    item: IBlock,
    searchQuery: string,
    triggerKey?: string
  ) {
    const label = isValidString(resolveNodeLabelString(item));
    content = content?.replace(
      triggerKey + (searchQuery ?? ""),
      `[${label ?? "Unknown"}](resource=${item.id})`
    );
    const mentionRegexPattern = inlineLinkPatterns.find(
      (pattern) => pattern.type === InlineType.MENTION
    );
    innerHTML = innerHTML.replace(
      triggerKey + (searchQuery ?? ""),
      mentionRegexPattern?.replacement
        .replace("$1", label ?? "Unknown")
        .replace("$2", item.id.toString()) ?? ""
    );
    setTimeout(() => {
      renderMentions();
    }, 10);
    // refreshMentions();
  }

  export function addEmoji(emoji: any, searchQuery: string) {
    const codeMatch = emoji.code.match(/&#X([0-9A-F]+)/i);
    if (codeMatch) {
      const emojiChar = String.fromCodePoint(parseInt(codeMatch[1], 16));
      const searchText = ":" + searchQuery;

      // Find the last occurrence of the search text (most likely the one user is typing)
      const searchIndex = content?.lastIndexOf(searchText) ?? -1;

      if (searchIndex !== -1 && content) {
        // Replace only at the specific position
        const before = content.substring(0, searchIndex);
        const after = content.substring(searchIndex + searchText.length);
        content = before + emojiChar + after;

        // Do the same for innerHTML
        const htmlSearchIndex = innerHTML.lastIndexOf(searchText);
        if (htmlSearchIndex !== -1) {
          const htmlBefore = innerHTML.substring(0, htmlSearchIndex);
          const htmlAfter = innerHTML.substring(
            htmlSearchIndex + searchText.length
          );
          innerHTML = htmlBefore + emojiChar + htmlAfter;
        }

        dispatchChangeEvent();

        // Set caret position after the inserted emoji
        setTimeout(() => {
          const newCaretPosition = searchIndex + emojiChar.length;
          setCaretPosition(blockRef, newCaretPosition);
        }, 10);
      }
    }
  }

  export function set(content: string) {
    innerHTML = content;
  }
  export function removeSlashText() {
    innerHTML = innerHTML.split("/")[0];
    content = blockRef.textContent;
    dispatchChangeEvent();
  }
  export function addCharacter(character: string) {
    innerHTML = innerHTML + character;
    content = blockRef.textContent;
    dispatchChangeEvent();
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
    try {
      const container = document.getElementById(id);
      if (!container) return;
      const mentions = container.querySelectorAll("placeholder.inline-mention");
      mentions.forEach((el) => {
        const id = el.getAttribute("data-record-id")
          ? el.getAttribute("data-record-id")
          : "";
        const label = el.getAttribute("data-label");
        const placeholder = document.createElement("div");
        const inlineMention = new InlineMention({
          target: placeholder,
          props: { id: id ?? "", label }
        });
        if (isInitialRender) {
          el.replaceWith(...placeholder.childNodes);
          return;
        }
        newInlineSpanId = generateSimpleRandomId();
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
    } catch (error) {
      logger.error({ at: "renderMentions", error });
    }
  }

  function renderInlineLinks(isInitialRender: boolean = false) {
    try {
      const container = document.getElementById(id);
      if (!container) return false;
      const inlineLinks = container.querySelectorAll("placeholder.inline-link");
      if (!inlineLinks.length) return false;
      inlineLinks.forEach((el) => {
        const href = el.getAttribute("data-href")
          ? el.getAttribute("data-href")
          : "";
        const label = el.getAttribute("data-label")
          ? el.getAttribute("data-label")
          : "";
        const placeholder = document.createElement("div");
        const inlineLink = new InlineLink({
          target: placeholder,
          props: { href: href ?? "", label: label ?? "" }
        });
        if (isInitialRender) {
          el.replaceWith(...placeholder.childNodes);
          return;
        }
        newInlineSpanId = generateSimpleRandomId();
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
      return true;
    } catch (error) {
      logger.error({ at: "renderInlineLinks", error });
      return false;
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
    clearTimeout(keyboardTimeout);
    isKeyboardInput = true;
    typing = true;
    if (isMarkdown) {
      const position = resolveCaretPosition();
      dispatch("keydown", {
        event,
        position
      });
    } else {
      dispatch("keydown", event);
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
    const lineFactor = (editableBottom - caretBottom) / lineHeight;
    // logger.debug({
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

    const isMultilined = editableRect.height > 2 * lineHeight;
    const totalOffset = getCaretCharacterOffsetWithin(blockRef);
    let caretOffset = getLineStartOffset(blockRef, totalOffset);
    const totalLength = blockRef.textContent?.length || 0;
    return {
      isFirstLine,
      isLastLine,
      caretOffset,
      totalOffset,
      totalLength,
      isMultilined,
      lineFactor
    };

    function getCaretCharacterOffsetWithin(element: any) {
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

    function getLineStartOffset(element: any, caretOffset: number) {
      const text = element.textContent;
      let lineStart = caretOffset;
      while (lineStart > 0 && text && text[lineStart - 1] !== "\n") {
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
   * Handles keyup event to perform various actions like symbol and inline shortcut formatting, backspace event etc.
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
    saveCaretPosition();
    content = parsedMdContent ?? "";
    dispatchChangeEvent();
    const steps = [
      replaceInlineSymbols,
      () => replaceInlineStyling(event),
      () => handleInlineLinks(event)
    ];
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
      setTimeout(() => {
        if (blockRef) {
          const parsedMdContent = extractInlineMarkdownFromHtml(
            blockRef?.innerHTML
          );
          content = parsedMdContent ?? "";
          dispatchChangeEvent();
        }
      }, 500);
    }
    clearTimeout(typingTimeout);
    clearTimeout(keyboardTimeout);
    typingTimeout = setTimeout(() => {
      typing = false;
    }, 10);
    keyboardTimeout = setTimeout(() => {
      isKeyboardInput = false;
    }, 30);
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
  function handleInlineLinks(event: KeyboardEvent) {
    if (event.key === "Backspace" || !(event.key === ")")) {
      return false;
    }
    const hasPlaceholders = renderInlineLinkPlaceholders(true);
    if (!hasPlaceholders) return;
    setTimeout(() => {
      renderInlineLinks();
    }, 10);
    return true;
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
      newInlineSpanId = generateSimpleRandomId();
      isNewSpanInserted = true;
      const replacementWithNewSpan =
        pattern.replacement + `<span id="${newInlineSpanId}">&#8203;</span>`;
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
    const data = await resolvePasteContents(event, {
      maxFileSizeInMb: MAX_FILE_SIZE_MB
    });
    if (!data || data.error || (!isMarkdown && !data?.text)) return;
    if (!isMarkdown) {
      pasteText();
      return;
    }

    if (
      !data.text ||
      data.textMetadata?.isMultiBlockText ||
      data.textMetadata?.isEmbed ||
      (data.contentType &&
        [
          NodeType.YOUTUBE_VIDEO,
          NodeType.YOUTUBE_SHORT,
          NodeType.CODE
        ].includes(data.contentType))
    ) {
      dispatch("paste", event);
      return;
    }
    if (data.text && data.textMetadata?.isUrl) {
      const domain = data.text.split("://").pop();
      let parts = domain?.split("/");
      let label =
        parts?.[0] + ": " + (parts?.[1] ? parts?.[1].split("_").join(" ") : "");
      label = truncateString(label ?? "", 30);
      const urlText = `[${label}](${data.text})`;
      pasteText(urlText);
      const hasPlaceholders = renderInlineLinkPlaceholders(true);
      if (!hasPlaceholders) return;
      setTimeout(() => {
        renderInlineLinks();
      }, 10);
      return;
    }
    pasteText();

    function pasteText(text?: string) {
      event?.preventDefault();
      if (!text) text = event.clipboardData?.getData("text/plain") ?? "";
      // document.execCommand("insertText", false, text);
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      range?.deleteContents();
      range?.insertNode(document.createTextNode(text));
      content = blockRef.textContent ?? "";
      dispatch("paste", { value: text });
      dispatchChangeEvent();
    }
  }

  function dispatchChangeEvent() {
    dispatch("change", content);
    debouncedDispatchChange();
  }
  const debouncedDispatchChange = debouncer(
    () => dispatch("debouncedChange", content),
    1000
  );

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

{#if isReadOnly}
  <div
    data-type={dataType}
    bind:innerHTML
    style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
    class="w-full h-full text-left outline-none py-1"
    contenteditable="false"
  ></div>
{:else if typeof content === "string"}
  <div class="relative w-full userdata">
    <div
      bind:this={blockRef}
      {id}
      data-type={dataType}
      style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
      class={cn(
        "inline-markdown relative w-full h-full text-left outline-none py-1",
        classList,
        {
          customcaret: isCustomCaret,
          noncustomcaret: !isCustomCaret,
          typing: typing,
          nontyping: !typing
        }
      )}
      role="textbox"
      tabindex="0"
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
        block: "nearest",
        eager: {
          bottom: $view.isConstrainedWidth ? 250 : 60
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
{/if}

{#if !isMarkdown}
  <KeyboardToolbar class="bg-bgs2 h-14 px-4 flex items-center justify-between">
    <div class="flex items-center justify-center gap-2"></div>
    <div class="flex items-center justify-center gap-2">
      <Button
        icon="ph:caret-line-down-light"
        label="close"
        parentBgIndex={2}
        size={Size.sm}
        isPreventMinWidth={true}
        on:click={() => {
          document.activeElement?.blur();
        }}
      />
    </div>
  </KeyboardToolbar>
{/if}

<style>
  div[contenteditable].noncustomcaret {
    caret-color: var(--customcolor, rgb(var(--colors-aps1))) !important;
  }
  div[contenteditable].customcaret {
    caret-color: transparent;
  }
  div[contenteditable]:empty::after {
    content: attr(placeholder);
    color: gray;
  }
  [contenteditable]::selection {
    background-color: rgb(var(--colors-aps2));
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
