<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import {
    BlockAction,
    InlineType
  } from "$lib/client/components/markdown/md.type";
  import { mdContentChangeEvent, type MdStoreType } from "../markdown.store";
  import BlockBrowser from "../blockBrowser/BlockBrowser.svelte";

  import {
    headingNodeTypes,
    ListType,
    NodeType,
    type ListNodeType,
    type SimpleTextNodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import InlineMarkdownTextInput from "./InlineMarkdownTextInput.svelte";
  import SearchResultsPopover from "$lib/client/elements/input/SearchResultsPopover.svelte";
  import LinkSearchResultItem from "$lib/client/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import { deepCopy } from "$lib/shared/utils/obj.utils";
  import { getContext } from "svelte";
  import { logger } from "../../debug/logger.client";
  import { SearchStore } from "$lib/client/products/memotron/memotron.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { renderMdAsHtml } from "../markdown.utils";

  const nodeContentContext = getContext<any>("content");
  const blockContext = getContext<any>("block");

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
  let mentionSearchRef: SearchResultsPopover;
  let isBlockBrowserRendered: boolean = false;
  let isRenderMentionSearch: boolean = false;
  let blockSearchQuery = "";
  let mentionSearchQuery = "";
  let previousVal = deepCopy(text);
  let mentionTriggerKey: string;
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
      default:
        sizing = "text-base";
        blockSpecificPlaceholder = undefined;
        break;
    }
  }

  /**
   *
   * TODO - mode blockToFocus as its own store and send offset in case of tab operations and caret at the end or in the middle before tab operations - currently caret is being set to the start if no timeout is used since the focus is being set before the block is rendered - subscribe to blockToFocus in inlineMarkdownTextInput and set the focus there if that's the last resort (but try avoiding any md related features in inlineMarkdownTextInput)
   */
  onMount(() => {
    hidePopover();
    const focusBlockSub = mdStore.focus.subscribe((x) => {
      if (x?.id === id) {
        logger.log({ at: "TextContent focus", x });
        setTimeout(() => {
          textRef?.focus(x.params);
        }, 10);
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
      listType?: ListType;
    }
  ) {
    if (contentType === toType) return;
    relay(BlockAction.CONVERT, {
      toType,
      params
    });
  }

  function hidePopover(
    popover: "blockBrowser" | "mentionSearch" = "blockBrowser"
  ) {
    if (popover === "blockBrowser") isBlockBrowserRendered = false;
    else isRenderMentionSearch = false;
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
    popover: "blockBrowser" | "mentionSearch" = "blockBrowser"
  ) {
    if (popover === "blockBrowser") isBlockBrowserRendered = true;
    else isRenderMentionSearch = true;
    setTimeout(() => {
      popoverRef.show();
    }, 10);
  }
  /**
   * Handles block browser shortcuts.
   * @returns boolean - true if the event is handled by the block browser, false otherwise
   */
  function handleBlockBrowser(
    event: KeyboardEvent,
    type: "keyup" | "keydown" = "keydown"
  ) {
    if (!$mdStore.params?.canUseSlashShortcut) return false;
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
    if (type === "keydown" && (event.key === "@" || event.key === "[")) {
      logger.log({
        at: "handleMentionShortcut - triggered",
        key: event.key
      });
      mentionTriggerKey = event.key;
      showPopover("mentionSearch");
      return true;
    } else if (!isRenderMentionSearch) {
      return false;
    } else if (
      type === "keyup" &&
      (event.key === "Escape" || (!text.includes("@") && !text.includes("[")))
    ) {
      hidePopover("mentionSearch");
    } else if (type === "keyup") {
      mentionSearchRef.keyup(event);
    } else if (
      type === "keydown" &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter")
    ) {
      mentionSearchRef.keydown(event);
      event.preventDefault();
    }
    return true;
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
    // logger.log({
    //   at: "handleArrowKeys",
    //   position,
    //   position2,
    //   event
    // });
    if (!event.altKey) {
      const textLength = text.length;
      console.log({
        at: "handleArrowKeys",
        position,
        caretOffset: position?.caretOffset,
        textLength
      });
      let isHandled = false;
      if (event.key === "ArrowUp" && position?.caretOffset === 0) {
        mdStore.shiftFocus(id, "up", {
          xOffset: position2?.caretOffset
        });
        isHandled = true;
      } else if (
        event.key === "ArrowDown" &&
        position?.caretOffset === textLength
      ) {
        mdStore.shiftFocus(id, "down", {
          xOffset: position2?.caretOffset
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
    const textEscapeShortcuts: {
      shortcut: string;
      type: SimpleTextNodeType;
    }[] = [
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
      { shortcut: "* ", type: NodeType.LIST },
      { shortcut: "- ", type: NodeType.LIST },
      { shortcut: "+ ", type: NodeType.CHECKLIST },
      { shortcut: "1. ", type: NodeType.ORDERED_LIST }
    ];
    const isTextShortcutPresent = textEscapeShortcuts.some(
      ({ shortcut, type }) => {
        if (text.startsWith(shortcut)) {
          text = text.replace(shortcut, "");
          dispatchChangeEvent();
          textRef.replace(shortcut, "");
          convert(type);
          return true;
        } else {
          return handleEscShortcutForSecondaryLines(shortcut, type);
        }
      }
    );

    const isStructuralShortcutPresent = structuralEscapeShortcuts.some(
      ({ shortcut, type }) => {
        if (text === shortcut) {
          text = "";
          dispatchChangeEvent();
          textRef.set("");
          //TODO - handling structural block insertion for list
          if (contentType === NodeType.LIST || !id) return false;
          relay(BlockAction.INSERT, { blockType: type });
          return true;
        }
        return false;
      }
    );

    const isListShortcutPresent = listEscapeShortcuts.some(
      ({ shortcut, type }) => {
        if (text.startsWith(shortcut)) {
          text = text.replace(shortcut, "");
          dispatchChangeEvent();
          textRef.replace(shortcut, "");
          convert(type as ListNodeType);
          return true;
        }
        return handleEscShortcutForSecondaryLines(shortcut, type);
      }
    );

    return (
      isTextShortcutPresent ||
      isStructuralShortcutPresent ||
      isListShortcutPresent
    );
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
    const mentionPattern = /\[.*?\]\(resource=(.*?)\)/g;
    let match;
    while ((match = mentionPattern.exec(removed)) !== null) {
      const id = match[1];
      propagateToNodeContent("unmention", { location: id, id });
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
      text
    });
    if (params?.type === "keyup") {
      return false;
      if (
        !(params?.caretPosition === 0 && params?.inBlockPosition?.isFirstLine)
      )
        return false;
      if (text !== "" && contentType === NodeType.SIMPLE_TEXT) {
        mdStore.backspaceWithContent(id);
        event.preventDefault();
      } else if (text !== "") {
        //TODO - event.preventDefault() is not preventing from the backspace event to happen - but moving this to keydown event is not reliable as caretPosition is not reliable in keydown event - This unintended case only happens when backspaced from one charater offset in the front.
        // convert(NodeType.SIMPLE_TEXT);
        // event.preventDefault();
      }
      return true;
    }
    if (
      !text &&
      contentType === NodeType.SIMPLE_TEXT &&
      !isFirstBlockAndIsEmpty
    ) {
      performDelete();
      event.preventDefault();
      return true;
    } else if (
      contentType !== NodeType.SIMPLE_TEXT &&
      (params?.inBlockPosition?.caretOffset === 0 || !text)
    ) {
      convert(NodeType.SIMPLE_TEXT);
      event.preventDefault();
      return true;
    } else if (
      contentType === NodeType.SIMPLE_TEXT &&
      text &&
      params?.inBlockPosition?.caretOffset === 0
    ) {
      console.log({ at: "handleBackspace - backspace with content" });
      relay(BlockAction.BACKSPACE_WITH_CONTENT);
      event.preventDefault();
      return true;
    }

    function performDelete() {
      relay(BlockAction.DELETE);
    }
  }

  async function handlePaste(event: ClipboardEvent) {
    const items = event?.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("text") === 0) {
        //TODO - Handle text paste
      } else if (items[i].type.indexOf("image") === 0) {
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
        event.preventDefault();
      }
    }
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
    if (result.status === 200) {
      text = text + `<img src="${signedUrl}"/>`;
    }
  }
  function assignPlaceholder() {
    placeholder = blockSpecificPlaceholder ?? resolveDefaultPlaceholder();

    function resolveDefaultPlaceholder() {
      let dynamicPlaceholder = undefined;
      if (nodeContentContext.resolveDynamicParams) {
        const params = nodeContentContext.resolveDynamicParams(
          isFirstBlockAndIsEmpty
        );
        dynamicPlaceholder = params?.placeholder;
      }
      return (
        dynamicPlaceholder ??
        $mdStore.params?.placeholder ??
        ($mdStore.params?.isNodular
          ? "Start typing or type / to browse..."
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
    return new SearchStore().searchForLinking(searchQuery);
  }

  function onMentionSelect(event: CustomEvent) {
    const item = event.detail.item;
    logger.log({ at: "onMentionSelect", item });
    textRef.addMention(item, mentionSearchQuery, mentionTriggerKey);
    hidePopover("mentionSearch");
    mentionSearchQuery = "";
    propagateToNodeContent("mention", {
      location: id,
      item
    });
  }

  function onFocus() {
    isFocusing = true;
    const currentBlockIndex = $mdStore.blocks.findIndex((x) => x.id == id);
    for (let i = currentBlockIndex; i >= 0; i--) {
      if (headingNodeTypes.includes($mdStore.blocks[i].contentType)) {
        $mdStore.activeHeading = $mdStore.blocks[i].id;
        break;
      }
    }
    refreshPlaceholder();
  }

  function onBlur() {
    dispatch("blur");
    isFocusing = false;
    refreshPlaceholder();
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
    isPlaceAtCaret: true,
    offsetInPx: 10,
    id: isRenderMentionSearch ? "mentionSearchPopover" : "blockBrowserPopover",
    class: cn({
      "w-72": blockSearchQuery,
      "w-[30rem]": !blockSearchQuery
    })
  }}
  triggerClass="w-full"
  isPreventDefault={true}
>
  <div class="relative w-full flex justify-start">
    {#if $mdStore.params?.isReadOnly}
      <div
        id={id.toString()}
        style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
        class="flex justify-start text-left w-full min-h-fit outline-none py-2 {sizing} {contentType ===
        NodeType.QUOTE
          ? 'px-2'
          : 'px-1'}"
      >
        {@html renderMdAsHtml(text)}
      </div>
    {:else}
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
          isMarkdown={true}
          on:keydown={handleKeyDown}
          on:keyup={handleKeyUp}
          on:change={dispatchChangeEvent}
          on:focus={onFocus}
          on:blur={onBlur}
          bind:placeholder
        />
      </div>
    {/if}
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
    {:else if isRenderMentionSearch}
      <SearchResultsPopover
        bind:this={mentionSearchRef}
        searchResultComponent={LinkSearchResultItem}
        isAlwaysShowSearchFeedback={true}
        searchCallback={onMentionSearch}
        shortcutTriggers={["@", "["]}
        on:select={onMentionSelect}
        on:reset={() => {
          hidePopover("mentionSearch");
        }}
      />
    {/if}
  </slot>
</Popover>
