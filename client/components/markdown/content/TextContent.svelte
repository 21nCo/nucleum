<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { BlockAction, InlineType } from "@21n/components/markdown/md.type";
  import {
    mdContentChangeEvent,
    type MdStoreType
  } from "@21n/components/markdown/markdown.store";
  import BlockBrowser from "@21n/components/markdown/blockBrowser/BlockBrowser.svelte";
  import EmojiPicker from "./EmojiPicker.svelte";

  import {
    headingNodeTypes,
    ListType,
    NodeType,
    type ListNodeType,
    type SimpleTextNodeType
  } from "@21n/products/memotron/node/node.type";
  import { cn } from "@21n/utils/ui.utils";
  import Popover from "@21n/elements/popover/Popover.svelte";
  import InlineMarkdownTextInput from "@21n/components/markdown/content/InlineMarkdownTextInput.svelte";
  import SearchResultsPopover from "@21n/elements/input/SearchResultsPopover.svelte";
  import LinkSearchResultItem from "@21n/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import { deepCopy } from "@21n/shared-utils/obj.utils";
  import { getContext } from "svelte";
  import { logger } from "@21n/components/debug/logger.client";
  import { SearchStore } from "@21n/components/record/record.store";
  import type { IRecordId } from "@21n/types/data.type";
  import {
    inlineLinkPatterns,
    performEscShortcuts,
    renderMdAsHtml
  } from "@21n/components/markdown/markdown.utils";
  import view from "@21n/stores/view.store";
  import context from "@21n/stores/context.store";
  import { popover } from "@21n/actions/popover.action";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { dispatchCustomEvent } from "@21n/utils/browser.utils";
  import { GlobalEvent } from "@21n/types/event.enum";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";

  const nodeContentContext = getContext<any>("content");
  const blockContext = getContext<any>("block");
  const nodeContext = getContext<any>("node");
  const markdownContext = getContext<any>("markdown");

  function propagateToNodeContent(event: string, data: any) {
    if (!nodeContentContext) {
      logger.error({
        at: "TextContent propagateToNodeContent",
        error: "No Node context found",
        data
      });
      return;
    }
    nodeContentContext.publish(event, data);
  }

  /**
   * Relays an event to the block context.
   * @param event event name
   * @param data event data
   */
  function relay(event: BlockAction, data?: any) {
    if (!blockContext.publish) {
      logger.error({
        at: "TextContent propagate",
        error: "No block context found",
        data
      });
      return;
    }
    blockContext.publish(event, data);
  }

  const dispatch = createEventDispatcher();
  export let mdStore: MdStoreType;
  export let id: IRecordId;
  export let text: string;
  export let contentType: NodeType;
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;

  $: refreshPlaceholder(isHovering, blockSpecificPlaceholder);

  let isFirstBlockAndIsEmpty = mdStore.isFirstBlockAndIsEmpty(id);
  let textRef: InlineMarkdownTextInput;
  let sizing = "";
  let blockSpecificPlaceholder: string | undefined = undefined;
  let placeholder: string;
  let popoverRef: any;
  let blockBrowserRef: any;
  let isBlockBrowserRendered: boolean = false;
  let isRenderMentionSearch: boolean = false;
  let isRenderEmojiPicker: boolean = false;
  let blockSearchQuery = "";
  let mentionSearchQuery = "";
  let emojiSearchQuery = "";
  let previousVal = text ? deepCopy(text) : "";
  let mentionTriggerKey: string;
  let mentionSearchPopoverId: string = generateSimpleRandomId();
  let emojiPickerRef: any;
  let isEmojiPickerDismissed: boolean = false;
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

  /**
   * Checks if the block is of type code or quote and prevents the insertion of a new block on pressing enter - inserts a new line instead
   */
  $: isPreventInsertOnEnter = contentType === NodeType.CODE;
  $: {
    switch (contentType) {
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
      case NodeType.LIST:
        sizing = "text-base";
        blockSpecificPlaceholder = "List item";
        break;
      case NodeType.ORDERED_LIST:
        sizing = "text-base";
        blockSpecificPlaceholder = "List item";
        break;
      case NodeType.CHECKLIST:
        sizing = "text-base";
        blockSpecificPlaceholder = "Check item";
        break;
      default:
        sizing = "text-base";
        blockSpecificPlaceholder = undefined;
        break;
    }
  }

  /**
   *
   * TODO - mode blockToFocus as its own store and send offset in case of tab operations and caret at the end or in the middle before tab operations - currently caret is being set to the start if no timeout is used since the focus is being set before the block is rendered - subscribe to blockToFocus in inlineMarkdownTextInput and set the focus there if that's the last resort (but try avoiding any md related features in inlineMarkdownTextInput)
   *
   * Notes: if timeout is used - virtual keyboard is not being triggered on mobile devices as setTimeout() is creating another call stack. Watch for need for timeout - above issue and the need for timeout might no longer be required after all the block changes.
   */
  onMount(() => {
    hidePopover();
    const focusBlockSub = mdStore.focus.subscribe((x) => {
      if (x?.id === id) {
        logger.log({ at: "TextContent focus", x });
        // setTimeout(() => {
        //   textRef?.focus(x.params);
        // }, 10);
        textRef?.focus(x.params);
        assignPlaceholder();
      }
    });
    return () => {
      focusBlockSub();
    };
  });

  /**
   * Relays the convert event to the parent.
   *
   * @param toType
   * @param params
   */
  function convert(
    toType: SimpleTextNodeType | ListNodeType,
    params?: {
      indentLevel?: number;
      listOrder?: number;
      isChecked?: boolean;
    }
  ) {
    if (contentType === toType) return;
    relay(BlockAction.CONVERT, {
      toType,
      params
    });
  }

  function hidePopover(
    popover: "blockBrowser" | "mentionSearch" | "emojiPicker" = "blockBrowser"
  ) {
    if (popover === "blockBrowser") isBlockBrowserRendered = false;
    else if (popover === "mentionSearch") isRenderMentionSearch = false;
    else if (popover === "emojiPicker") isRenderEmojiPicker = false;
    popoverRef.hide();
  }
  /**
   * @description
   * A delay of 10ms is added as without this - renderPopover in Popover.svelte is not calculating the popover width, height correctly. This is happening because, the popover content is being rendered dynamically switching between blockBrowser and mentionSearch.
   *
   * Alternatives to this approach:
   * 1. Add height, width to the {@link Popover} - options like below:
   * <Popover bind:this={popoverRef}  options={{ ... class: cn("h-48", { "w-72": blockSearchQuery, "w-[30rem]": !blockSearchQuery }) }}
   * With this approach, it is required that both mention search and block browser should have same height and width and also the height, width is not handled at the respective components which is not a good approach.
   *
   * 2. Create multiple instances of Popover for blockBrowser and mentionSearch and show/hide them based on the popover to be shown. This approach might not be ideal as this increased boilerplace code.
   * @param popover
   */
  function showPopover(
    popover: "blockBrowser" | "mentionSearch" | "emojiPicker" = "blockBrowser"
  ) {
    if (popover === "blockBrowser") isBlockBrowserRendered = true;
    else if (popover === "mentionSearch") {
      isRenderMentionSearch = true;
      appendZeroWidthSpace();
    } else if (popover === "emojiPicker") {
      isRenderEmojiPicker = true;
    }
    if ($view.isConstrainedWidth) return;
    setTimeout(() => {
      popoverRef.show();
    }, 10);

    /**
     * Appends a zero width space to the text so that the mention search query can be resolved in the search results popover
     */
    function appendZeroWidthSpace() {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      if (range) {
        const zwsp = document.createTextNode("\u200b");
        range.insertNode(zwsp);
        range.setStartBefore(zwsp);
        range.setEndBefore(zwsp);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }
  /**
   * Handles block browser shortcuts.
   * @returns boolean - true if the event is handled by the block browser, false otherwise
   */
  function handleBlockBrowser(
    event: KeyboardEvent,
    type: "keyup" | "keydown" = "keydown"
  ) {
    if (
      !$mdStore.params?.canUseSlashShortcut ||
      ($context.isTouchDevice && $view.isConstrainedWidth)
    )
      return false;
    if (type === "keyup" && event.key === "/") {
      console.log("block browser shortcut");
      showPopover("blockBrowser");
      return true;
    } else if (!isBlockBrowserRendered) {
      return false;
    } else if (
      type === "keyup" &&
      (event.key === "Escape" || !text.includes("/"))
    ) {
      hidePopover("blockBrowser");
    } else if (
      type === "keydown" &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter")
    ) {
      blockBrowserRef.key(event.key);
      event.preventDefault();
    } else if (type === "keyup") {
      blockBrowserRef.filter(text);
    }
    return true;
  }

  function handleMentionShortcut(
    event: KeyboardEvent,
    type: "keyup" | "keydown" = "keydown"
  ) {
    if (!$mdStore.params?.canUseSlashShortcut) return false;
    if (
      type === "keydown" &&
      (event.key === "@" || (event.key === "[" && text.endsWith("[")))
    ) {
      logger.log({
        at: "handleMentionShortcut - triggered",
        key: event.key
      });
      mentionTriggerKey = event.key === "[" ? "[[" : event.key;
      showPopover("mentionSearch");
      return true;
    } else if (!isRenderMentionSearch) {
      return false;
    } else if (
      type === "keyup" &&
      (event.key === "Escape" || (!text.includes("@") && !text.includes("[[")))
    ) {
      hidePopover("mentionSearch");
    } else if (type === "keyup") {
      // mentionSearchRef.keyup(event);
      dispatchCustomEvent(GlobalEvent.SEARCH_RESULT_KEYUP, {
        id: mentionSearchPopoverId,
        event
      });
    } else if (
      type === "keydown" &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter")
    ) {
      // mentionSearchRef.keydown(event);
      dispatchCustomEvent(GlobalEvent.SEARCH_RESULT_KEYDOWN, {
        id: mentionSearchPopoverId,
        event
      });
      event.preventDefault();
    }
    return true;
  }

  function handleEmojiShortcut(
    event: KeyboardEvent,
    type: "keyup" | "keydown" = "keydown"
  ) {
    if (!$mdStore.params?.canUseSlashShortcut) return false;
    const hasColon = text.includes(":");

    if (type === "keydown" && event.key === ":") {
      logger.log({
        at: "handleEmojiShortcut - triggered",
        key: event.key
      });
      isEmojiPickerDismissed = false;
      return true;
    } else if (!hasColon && !isRenderEmojiPicker) {
      isEmojiPickerDismissed = false;
      return false;
    } else if (type === "keyup" && event.key === "Escape") {
      if (isRenderEmojiPicker) {
        hidePopover("emojiPicker");
        isEmojiPickerDismissed = true;
      }
    } else if (type === "keyup" && !hasColon) {
      if (isRenderEmojiPicker) {
        hidePopover("emojiPicker");
      }
      isEmojiPickerDismissed = false;
    } else if (type === "keyup" && hasColon && !isEmojiPickerDismissed) {
      const colonIndex = text.lastIndexOf(":");
      if (colonIndex !== -1) {
        const beforeColon = text.substring(0, colonIndex);
        const charBeforeColon = beforeColon.slice(-1);
        const isValidEmojiContext = colonIndex === 0 || /\s/.test(charBeforeColon);
        
        if (!isValidEmojiContext) {
          if (isRenderEmojiPicker) {
            hidePopover("emojiPicker");
          }
          return false;
        }
        
        const afterColon = text.substring(colonIndex + 1);
        const spaceIndex = afterColon.search(/\s/);
        emojiSearchQuery =
          spaceIndex === -1 ? afterColon : afterColon.substring(0, spaceIndex);
        
        if (emojiSearchQuery.trim()) {
          if (!isRenderEmojiPicker) {
            showPopover("emojiPicker");
          }
        } else {
          if (isRenderEmojiPicker) {
            hidePopover("emojiPicker");
          }
        }
      }
    } else if (
      type === "keydown" &&
      isRenderEmojiPicker &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter")
    ) {
      emojiPickerRef?.key(event.key);
      event.preventDefault();
    }
    return isRenderEmojiPicker;
  }

  function handleKeyDown(
    e: CustomEvent<{
      event: KeyboardEvent;
      position: any;
      position2: any;
    }>
  ) {
    const event = e.detail.event;
    logger.log({
      at: "handleKeyDown",
      text,
      event
    });
    const functions = [
      () => handleBlockBrowser(event),
      () => handleMentionShortcut(event),
      () => handleEmojiShortcut(event),
      () =>
        handleBackspace(event, {
          inBlockPosition: e.detail.position
        }),
      () => handleArrowKeys(e)
    ];

    for (const func of functions) {
      if (func()) return;
    }

    if (event.key === "Tab") {
      if (event.shiftKey === true) {
        relay(BlockAction.SHIFT_TAB);
      } else {
        relay(BlockAction.TAB);
      }
      event.preventDefault();
    } else if (
      (event.key === "Enter" && !isPreventInsertOnEnter && !event.shiftKey) ||
      (event.key === "Enter" && event.metaKey)
    ) {
      relay(BlockAction.INSERT, {
        caretPosition: e.detail.position
      });
      event.preventDefault();
    }
  }

  function handleArrowKeys(
    e: CustomEvent<{
      event: KeyboardEvent;
      position: any;
      position2: any;
    }>
  ) {
    const event = e.detail.event;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return false;
    const position = e.detail.position;
    const position2 = e.detail.position2;
    if (!event.altKey) {
      let isHandled = false;
      if (
        event.key === "ArrowUp" &&
        (position?.caretOffset === 0 || position?.isFirstLine)
      ) {
        if (mdStore.isFirstBlock(id)) {
          const captureTitle = document.getElementById("capture-title");
          let nodeTitle = undefined;
          if (nodeContext?.id) {
            nodeTitle = document.getElementById(`title-${nodeContext.id}`);
          }
          if (captureTitle) {
            (captureTitle as HTMLElement).focus();
            event.preventDefault();
            return true;
          } else if (nodeTitle) {
            (nodeTitle as HTMLElement).focus();
            event.preventDefault();
            return true;
          }
        }
        mdStore.shiftFocus(id, "up", {
          xOffset: position?.caretOffset
        });
        isHandled = true;
      } else if (
        event.key === "ArrowDown" &&
        ((position?.caretOffset === 0 &&
          (position?.totalLength === 0 || !position?.isMultilined)) ||
          position?.caretOffset !== 0) &&
        (position?.caretOffset === position?.totalLength ||
          position?.isLastLine)
      ) {
        mdStore.shiftFocus(id, "down", {
          xOffset: position?.caretOffset
        });
        isHandled = true;
      }
      if (isHandled) {
        event.preventDefault();
        return true;
      }
    } else if (event.altKey) {
      if (event.key === "ArrowUp") {
        relay(BlockAction.MOVEUP);
      } else if (event.key === "ArrowDown") {
        relay(BlockAction.MOVEDOWN);
      }
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    return false;
  }

  /**
   * @deprecated - no longer used as `Enter` key creates a new block instead of inserting a new line in the same block
   * @param shortcut
   * @param type
   * @param listType
   */
  function handleEscShortcutForSecondaryLines(
    shortcut: string,
    type: NodeType,
    listType?: ListType
  ) {
    if (
      contentType === NodeType.SIMPLE_TEXT &&
      caretPositionT2 &&
      caretPositionT2.endContainer.nodeType === 3 &&
      caretPositionT2.endContainer.nodeValue &&
      caretPositionT2.endContainer.nodeValue.startsWith(shortcut)
    ) {
      //delete the parent <div> of the text node and insert new block with the type
      text = text.replace(shortcut, "");
      textRef.replace(shortcut, "");
      if (id) {
        relay(BlockAction.INSERT, {
          blockType: type,
          listType
        });
      }
      setTimeout(() => {
        let parent = undefined;
        if (id) parent = document.getElementById(id.toString());
        // console.log("parent", parent, parent?.lastChild);
        if (parent && parent.lastChild) {
          parent.removeChild(parent.lastChild);
        }
      }, 10);
    }
  }
  /**
   * Handles escape shortcuts for text, structural and list nodes when entered at the start of the block
   */
  function performEscapeShortcutsT2() {
    const nodeContentType =
      nodeContext?.contentType ?? NodeType.NODULAR_MARKDOWN;

    const result = performEscShortcuts(nodeContentType, text);
    if (!result) return false;
    const { shortcut, type, isFullReplace, indentLevel, listOrder, isChecked } =
      result;
    if (isFullReplace) {
      text = "";
      dispatchChangeEvent();
      textRef.set("");
      relay(BlockAction.INSERT, { blockType: type });
      return true;
    }
    text = text.replace(shortcut, "");
    dispatchChangeEvent();
    textRef.replace(shortcut, "");
    convert(type as SimpleTextNodeType | ListNodeType, {
      indentLevel,
      listOrder,
      isChecked
    });
    return true;
  }

  function diffStrings(oldStr: string, newStr: string) {
    let added = "";
    let removed = "";

    for (let i = 0; i < Math.max(oldStr.length, newStr.length); i++) {
      if (oldStr[i] !== newStr[i]) {
        if (oldStr[i] !== undefined) removed += oldStr[i];
        if (newStr[i] !== undefined) added += newStr[i];
      }
    }

    return { added, removed };
  }
  function dispatchChangeEvent() {
    const { added, removed } = diffStrings(previousVal, text);
    const mentionPattern = inlineLinkPatterns.find(
      (pattern) => pattern.type === InlineType.MENTION
    )?.regex;
    let match;
    while ((match = mentionPattern?.exec(removed)) !== null) {
      const mentionId = match?.[2];
      propagateToNodeContent("unmention", { location: id, id: mentionId });
    }
    if (previousVal === text) return;
    dispatch("update", text);
    previousVal = deepCopy(text);
    // relay(BlockAction.CHANGE, text);
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
  function handleKeyUp(
    e: CustomEvent<{
      event: KeyboardEvent;
      caretPosition: any;
      position: any;
    }>
  ) {
    isFirstBlockAndIsEmpty = mdStore.isFirstBlockAndIsEmpty(id);
    const event = e.detail.event;
    const caretPosition = e.detail.caretPosition;
    logger.log({
      at: "handleKeyUp",
      text,
      caretPosition,
      event
    });
    const steps = [
      () => handleBlockBrowser(event, "keyup"),
      () => handleMentionShortcut(event, "keyup"),
      () => handleEmojiShortcut(event, "keyup"),
      performEscapeShortcutsT2
      // () =>
      //   handleBackspace(event, {
      //     caretPosition,
      //     type: "keyup"
      //   })
    ];
    for (const func of steps) {
      if (func()) break;
    }
    mdContentChangeEvent.trigger();
    dispatchChangeEvent();
  }

  /**
   * Handles backspace key entry if occured at the start of the block
   *
   *
   * If the block is empty or not - if the caret position is at the start of the block
   * -> If the block is not a simple text type: Removes formatting of heading, quote, etc. and converts it to a simple text block if the block is not simple text
   *
   *
   * If the block is not empty and is simple text: Deletes the current block and moves all the content to the previous block if it exists
   *
   *
   * If the block is empty: Deletes the block and shifts focus to the previous block if it exists
   *
   *
   * Note: "keydown" event is used in cases when event.preventDefault() needs to stop the removal of the character to happen i.e. preventing the actual backspace event from happening.
   *
   */
  function handleBackspace(
    event: KeyboardEvent,
    params?: {
      caretPosition?: number;
      inBlockPosition?: any;
      type?: "keyup" | "keydown";
    }
  ) {
    if (event.key !== "Backspace") return false;

    logger.log({
      at: "handleBackspace",
      ...params?.inBlockPosition,
      text,
      textLength: text?.length
    });

    // Only interfere with backspace when user is at the absolute beginning of the block
    // This means: on first line AND at offset 0 from start of line AND at position 0 in total text
    const position = params?.inBlockPosition;
    const isAtVeryStart =
      position?.isFirstLine &&
      position?.caretOffset === 0 &&
      position?.totalOffset === 0;

    if (!isAtVeryStart) {
      // Let normal backspace behavior happen for all other cases
      return false;
    }

    // Now handle special block-level backspace operations
    if (
      !text &&
      contentType === NodeType.SIMPLE_TEXT &&
      !isFirstBlockAndIsEmpty
    ) {
      // Empty simple text block (not the first) - delete it
      relay(BlockAction.DELETE);
      event.preventDefault();
      return true;
    }

    if (contentType !== NodeType.SIMPLE_TEXT) {
      // Any non-simple-text block at start - convert to simple text
      convert(NodeType.SIMPLE_TEXT);
      event.preventDefault();
      return true;
    }

    if (text && contentType === NodeType.SIMPLE_TEXT) {
      // Non-empty simple text block at start - merge with previous block
      relay(BlockAction.BACKSPACE_WITH_CONTENT);
      event.preventDefault();
      return true;
    }

    return false;
  }

  function assignPlaceholder() {
    placeholder = blockSpecificPlaceholder ?? resolveDefaultPlaceholder();

    function resolveDefaultPlaceholder() {
      let dynamicPlaceholder = undefined;
      if (nodeContentContext?.resolveDynamicParams) {
        const params = nodeContentContext.resolveDynamicParams(
          isFirstBlockAndIsEmpty
        );
        dynamicPlaceholder = params?.placeholder;
      }
      return (
        dynamicPlaceholder ??
        $mdStore.params?.placeholder ??
        ($mdStore.params?.isNodular && !$view.isConstrainedWidth
          ? "Start typing or use / to browse..."
          : "Start typing... ")
      );
    }
  }
  function refreshPlaceholder(
    isHoveringParam?: boolean,
    blockSpecificPlaceholderParam?: string
  ) {
    if (isHoveringParam === undefined) isHoveringParam = isHovering;
    if (blockSpecificPlaceholderParam === undefined)
      blockSpecificPlaceholderParam = blockSpecificPlaceholder;
    isFirstBlockAndIsEmpty = mdStore.isFirstBlockAndIsEmpty(id);
    if (
      isHoveringParam ||
      isFirstBlockAndIsEmpty ||
      isFocusing ||
      blockSpecificPlaceholderParam
    ) {
      assignPlaceholder();
    } else if (placeholder) placeholder = "";
  }

  function onBlockSelect(event: CustomEvent) {
    if (event.detail.type === InlineType.MENTION) {
      return;
      //TODO - this is placing the caret at the start of block causing unintended behaviour
      textRef.removeSlashText();
      hidePopover();
      setTimeout(() => {
        textRef.addCharacter("@");
        showPopover("mentionSearch");
      }, 1000);
      return;
    }
    const parts = text.split("/");
    if (parts[0]) {
      text = parts[0];
      textRef.removeSlashText();
      relay(BlockAction.INSERT, {
        blockType: event.detail.type
      });
    } else {
      text = "";
      textRef.set("");
      if (id) {
        convert(event.detail.type);
      }
    }
    hidePopover();
  }
  function onMentionSearch(searchQuery: string) {
    mentionSearchQuery = searchQuery;
    return new SearchStore().searchForLinking(searchQuery, {
      exclude: [nodeContext?.id]
    });
  }

  function onMentionSelect(event: CustomEvent) {
    const item = event.detail.item;
    logger.log({ at: "onMentionSelect", item });
    textRef.addMention(item, mentionSearchQuery, mentionTriggerKey);
    hidePopover("mentionSearch");
    mentionSearchQuery = "";
    dispatchChangeEvent();
    propagateToNodeContent("mention", {
      location: id,
      item
    });
  }

  function onEmojiSelect(event: CustomEvent) {
    const emoji = event.detail.emoji;
    logger.log({ at: "onEmojiSelect", emoji });
    textRef.addEmoji(emoji, emojiSearchQuery);
    hidePopover("emojiPicker");
    emojiSearchQuery = "";
    dispatchChangeEvent();
  }

  function onFocus() {
    isFocusing = true;
    markdownContext({ event: "focus", id });
    refreshPlaceholder();
    mdStore.setActiveHeading(id);
  }

  function onBlur() {
    dispatch("blur");
    isFocusing = false;
    markdownContext({ event: "blur", id });
    refreshPlaceholder();
  }

  function handlePaste(event: CustomEvent<ClipboardEvent>) {
    relay(BlockAction.PASTE, event.detail);
  }
</script>

{#if !text && !$mdStore.params?.isReadOnly}
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

<Popover
  bind:this={popoverRef}
  options={{
    isPlaceAtCaret: $view.isConstrainedWidth ? false : true,
    offsetInPx: 10,
    id: isRenderEmojiPicker
      ? "emojiPickerPopover"
      : isRenderMentionSearch
        ? "mentionSearchPopover"
        : "blockBrowserPopover",
    class: cn({
      "w-72": blockSearchQuery,
      "w-[30rem]": !blockSearchQuery
    })
  }}
  triggerClass="w-full cursor-text"
  isPreventDefault={true}
>
  <div class="relative w-full flex justify-start">
    <div
      class={cn(
        sizing,
        "w-full flex justify-start",
        contentType === NodeType.QUOTE ? "pl-4" : ""
      )}
    >
      <InlineMarkdownTextInput
        bind:this={textRef}
        bind:content={text}
        id={id.toString()}
        dataType={contentType}
        isMarkdown={true}
        isReadOnly={$mdStore.params?.isReadOnly}
        on:keydown={handleKeyDown}
        on:keyup={handleKeyUp}
        on:change={dispatchChangeEvent}
        on:focus={onFocus}
        on:blur={onBlur}
        on:paste={handlePaste}
        bind:placeholder
      />
    </div>
    {#if contentType === NodeType.QUOTE}
      <div class="absolute top-0 left-0 h-full flex flex-col justify-center">
        <span class="w-1 bg-aps1 h-full my-2 rounded-md" />
      </div>
    {/if}
  </div>
  <slot slot="popover" name="popover">
    {#if isBlockBrowserRendered}
      <BlockBrowser
        bind:this={blockBrowserRef}
        on:select={onBlockSelect}
        bind:searchQueryString={blockSearchQuery}
      />
    {:else if !$view.isConstrainedWidth && isRenderMentionSearch}
      <SearchResultsPopover
        searchResultComponent={LinkSearchResultItem}
        id={mentionSearchPopoverId}
        isAlwaysShowSearchFeedback={true}
        searchCallback={onMentionSearch}
        shortcutTriggers={["@", "["]}
        on:select={onMentionSelect}
        on:reset={() => {
          hidePopover("mentionSearch");
        }}
      />
    {:else if !$view.isConstrainedWidth && isRenderEmojiPicker}
      <EmojiPicker
        bind:this={emojiPickerRef}
        bind:searchQuery={emojiSearchQuery}
        on:select={onEmojiSelect}
        on:noresults={() => {
          hidePopover("emojiPicker");
        }}
      />
    {/if}
  </slot>
</Popover>
{#if $view.isConstrainedWidth && isRenderMentionSearch}
  <div
    class="w-full"
    use:popover={{
      content: SearchResultsPopover,
      isSpanToTriggerWidth: true,
      triggerMethod: [PopoverTriggerMethod.SHOW_BY_DEFAULT],
      componentProps: {
        searchResultComponent: LinkSearchResultItem,
        isAlwaysShowSearchFeedback: true,
        id: mentionSearchPopoverId,
        searchCallback: onMentionSearch,
        shortcutTriggers: ["@", "["],
        onSelect: onMentionSelect,
        isApplyPopoverStyling: true,
        onReset: () => {
          hidePopover("mentionSearch");
        }
      }
    }}
  />
{/if}
{#if $view.isConstrainedWidth && isRenderEmojiPicker}
  <div
    class="w-full"
    use:popover={{
      content: EmojiPicker,
      isSpanToTriggerWidth: true,
      isRenderAsModalForCW: true,
      triggerMethod: [PopoverTriggerMethod.SHOW_BY_DEFAULT],
      componentProps: {
        searchQuery: emojiSearchQuery,
        onSelect: onEmojiSelect,
        onNoresults: () => {
          hidePopover("emojiPicker");
        },
        isPopoverContext: true
      }
    }}
  />
{/if}
