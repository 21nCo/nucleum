<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import type {
    IMarkdownStore,
    IBlock
  } from "$lib/client/components/markdown/md.type";
  import { mdContentChangeEvent, type MdStoreType } from "../markdown.store";
  import BlockBrowser from "../blockBrowser/BlockBrowser.svelte";

  import {
    headingNodeTypes,
    ListType,
    NodeType,
    type ListContent,
    type StructuralNodeType,
    type TextContent,
    type TextNodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import InlineMarkdownTextInput from "./InlineMarkdownTextInput.svelte";
  import SearchResultsPopover from "$lib/client/elements/input/SearchResultsPopover.svelte";
  import LinkSuggestionItem from "$lib/client/products/memotron/common/linkbox/LinkSuggestionItem.svelte";
  import { deepCopy } from "$lib/shared/utils/obj.utils";
  import { getContext } from "svelte";
  import { logger } from "../../debug/logger.client";
  import { SearchStore } from "$lib/client/products/memotron/memotron.store";

  const nodeContext = getContext<any>("content");
  const blockContext = getContext<any>("block");

  function propagateToNode(event: string, data: any) {
    if (!nodeContext) {
      logger.error({
        at: "TextContent propagateToNode",
        error: "No Node context found",
        data
      });
      return;
    }
    nodeContext({ event, data });
  }

  /**
   * Relays an event to the block context.
   * @param event event name
   * @param data event data
   */
  function relay(event: string, data?: any) {
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
  export let block: IBlock<TextContent | ListContent>;
  // export let context: BlockContext = BlockContext.DEFAULT;
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;
  $: {
    if (isHovering) assignPlaceholder();
    else if (!isFocusing && !isFirstBlockAndIsEmpty) placeholder = "";
  }
  const isFirstBlockAndIsEmpty = mdStore.isFirstBlockAndIsEmpty(block.id);
  let textRef: any;
  let sizing = "";
  const defaultPlaceholder =
    $mdStore.params?.placeholder ??
    ($mdStore.params?.isNodular ? "Type / for all blocks" : "Start typing... ");
  let blockSpecificPlaceholder: string | undefined = undefined;
  let placeholder: string;
  let popoverRef: any;
  let blockBrowserRef: any;
  let mentionSearchRef: any;
  let isBlockBrowserRendered: boolean = false;
  let isRenderMentionSearch: boolean = false;
  let blockSearchQuery = "";
  let shiftKeyPressed: boolean = false;
  let previousVal = deepCopy(block.body);
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
  $: isPreventInsertOnEnter =
    block.contentType === NodeType.CODE || block.contentType === NodeType.QUOTE;
  $: {
    switch (block.contentType) {
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

  /**
   *
   * TODO - mode blockToFocus as its own store and send offset in case of tab operations and caret at the end or in the middle before tab operations - currently caret is being set to the start if no timeout is used since the focus is being set before the block is rendered - subscribe to blockToFocus in inlineMarkdownTextInput and set the focus there if that's the last resort (but try avoiding any md related features in inlineMarkdownTextInput)
   */
  onMount(() => {
    hidePopover();
    const focusBlockSub = mdStore.focus.subscribe((x) => {
      if (x?.id === block.id) {
        setTimeout(() => {
          textRef.focus();
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
    toType: TextNodeType | NodeType.LIST,
    params?: {
      listType?: ListType;
    }
  ) {
    if (block.contentType === toType) return;
    relay("convert", {
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
      (event.key === "Escape" || !block.body.includes("/"))
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
      blockBrowserRef.filter(block.body);
    }
    return true;
  }

  function handleMentionShortcut(
    event: KeyboardEvent,
    type: "keyup" | "keydown" = "keydown"
  ) {
    if (!$mdStore.params?.canUseSlashShortcut) return false;
    if (event.key === "Shift") {
      shiftKeyPressed = true;
    } else if (event.key != "2") {
      shiftKeyPressed = false;
    }
    if (type === "keyup" && event.key === "2" && shiftKeyPressed) {
      console.log("mention shortcut");
      showPopover("mentionSearch");
      return true;
    } else if (!isRenderMentionSearch) {
      return false;
    } else if (
      type === "keyup" &&
      (event.key === "Escape" || !block.body.includes("@"))
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
      event.preventDefault();
    }
    return true;
  }

  function handleKeyDown(e: CustomEvent<KeyboardEvent>) {
    const event = e.detail;
    logger.log({ at: "handleKeyDown", event, body: block.body });
    const functions = [
      () => handleBlockBrowser(event),
      () => handleMentionShortcut(event),
      () => handleBackspace(event)
    ];

    for (const func of functions) {
      if (func()) return;
    }
    const isRelayOperations = block.contentType === NodeType.LIST;

    if (event.key === "Tab") {
      if (isRelayOperations) {
        if (event.shiftKey === true) {
          dispatch("shifttab", block.id);
        } else {
          dispatch("tab", block.id);
        }
      }
      event.preventDefault();
    } else if (
      (event.key === "Enter" && !isPreventInsertOnEnter && !event.shiftKey) ||
      (event.key === "Enter" && event.metaKey)
    ) {
      if (block.id && !isRelayOperations) {
        relay("insert");
      } else if (block.body != "") {
        dispatch("insertrelay", block.id);
      }
      event.preventDefault();
    }
  }

  function handleEscShortcutForSecondaryLines(
    shortcut: string,
    type: NodeType,
    listType?: ListType
  ) {
    if (
      block.contentType === NodeType.SIMPLE_TEXT &&
      caretPositionT2 &&
      caretPositionT2.endContainer.nodeType === 3 &&
      caretPositionT2.endContainer.nodeValue &&
      caretPositionT2.endContainer.nodeValue.startsWith(shortcut)
    ) {
      //delete the parent <div> of the text node and insert new block with the type
      block.body = block.body.replace(shortcut, "");
      textRef.replace(shortcut, "");
      if (block.id) {
        relay("insert", {
          blockType: type,
          listType
        });
      }
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
  /**
   * Handles escape shortcuts for text, structural and list nodes when entered at the start of the block
   */
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
    const isTextShortcutPresent = textEscapeShortcuts.some(
      ({ shortcut, type }) => {
        if (block.body.startsWith(shortcut)) {
          block.body = block.body.replace(shortcut, "");
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
        if (block.body === shortcut) {
          block.body = "";
          dispatchChangeEvent();
          textRef.set("");
          //TODO - handling structural block insertion for list
          if (block.contentType === NodeType.LIST || !block.id) return false;
          relay("insert", { blockType: type });
          return true;
        }
        return false;
      }
    );

    const isListShortcutPresent = listEscapeShortcuts.some(
      ({ shortcut, listType }) => {
        if (block.body.startsWith(shortcut)) {
          block.body = block.body.replace(shortcut, "");
          dispatchChangeEvent();
          textRef.replace(shortcut, "");
          convert(NodeType.LIST, { listType });
          return true;
        }
        return handleEscShortcutForSecondaryLines(
          shortcut,
          NodeType.LIST,
          listType
        );
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
    const { added, removed } = diffStrings(previousVal, block.body);
    const mentionPattern = /\[.*?\]\(resource=(.*?)\)/g;
    let match;
    while ((match = mentionPattern.exec(removed)) !== null) {
      const id = match[1];
      propagateToNode("unmention", { location: block.id, id });
    }
    previousVal = deepCopy(block.body);
    relay("change", { body: block.body });
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
    e: CustomEvent<{ event: KeyboardEvent; caretPosition: any }>
  ) {
    const event = e.detail.event;
    const caretPosition = e.detail.caretPosition;
    logger.log({ at: "handleKeyUp", event, body: block.body, caretPosition });
    const steps = [
      () => handleBlockBrowser(event, "keyup"),
      () => handleMentionShortcut(event, "keyup"),
      performEscapeShortcutsT2,
      () => handleBackspace(event, { caretPosition, type: "keyup" })
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
      type?: "keyup" | "keydown";
    }
  ) {
    if (event.key !== "Backspace") return false;
    if (params?.type === "keyup") {
      if (!(params?.caretPosition === 0)) return false;
      if (block.body !== "" && block.contentType === NodeType.SIMPLE_TEXT) {
        mdStore.backspaceWithContent(block);
        event.preventDefault();
      } else if (block.body !== "") {
        //TODO - event.preventDefault() is not preventing from the backspace event to happen - but moving this to keydown event is not reliable as caretPosition is not reliable in keydown event - This unintended case only happens when backspaced from one charater offset in the front.
        convert(NodeType.SIMPLE_TEXT);
        event.preventDefault();
      }
      return true;
    }
    if (!block.body) {
      if (block.contentType === NodeType.SIMPLE_TEXT) {
        performDelete();
      } else {
        convert(NodeType.SIMPLE_TEXT);
      }
      event.preventDefault();
      return true;
    }

    function performDelete() {
      relay("delete");
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
      block.body = block.body + `<img src="${signedUrl}"/>`;
    }
  }
  function assignPlaceholder() {
    placeholder = blockSpecificPlaceholder ?? defaultPlaceholder;
  }

  function onBlockSelect(event: CustomEvent) {
    const parts = block.body.split("/");
    if (parts[0]) {
      block.body = parts[0];
      textRef.removeSlashText();
      relay("insert", {
        blockType: event.detail.type
      });
    } else {
      block.body = "";
      textRef.set("");
      if (block.id) {
        convert(event.detail.type);
      }
    }
    hidePopover();
  }
  function onMentionSearch(searchQuery: string) {
    return new SearchStore().searchForLinking(searchQuery);
  }

  function onMentionSelect(event: CustomEvent) {
    const item = event.detail.item;
    textRef.addMention(item);
    hidePopover("mentionSearch");
    propagateToNode("mention", {
      location: block.id,
      id: item.id
    });
  }
</script>

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
    <!--  || !$isInEditMode -->
    {#if $mdStore.params?.isReadOnly}
      <div
        id={block.id}
        style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word;"
        class="flex justify-start text-left w-full h-full outline-none py-2 {sizing} {block.contentType ===
        NodeType.QUOTE
          ? 'px-2'
          : 'px-1'}"
      >
        {@html block.body}
      </div>
    {:else}
      <div
        class={cn(
          sizing,
          "w-full flex justify-start",
          block.contentType === NodeType.QUOTE ? "pl-2" : ""
        )}
      >
        <InlineMarkdownTextInput
          bind:this={textRef}
          bind:content={block.body}
          id={block.id}
          isMarkdown={true}
          on:keydown={handleKeyDown}
          on:keyup={handleKeyUp}
          on:change={dispatchChangeEvent}
          on:focus={() => {
            isFocusing = true;
            const currentBlockIndex = $mdStore.blocks.findIndex(
              (x) => x.id == block.id
            );
            for (let i = currentBlockIndex; i >= 0; i--) {
              if (headingNodeTypes.includes($mdStore.blocks[i].contentType)) {
                $mdStore.activeHeading = $mdStore.blocks[i].id;
                break;
              }
            }
          }}
          on:blur={() => {
            isFocusing = false;
            if (!isFirstBlockAndIsEmpty) placeholder = "";
            dispatch("blur");
          }}
          bind:placeholder
        />
      </div>
    {/if}
    {#if block.contentType === NodeType.QUOTE}
      <div class="absolute top-0 left-0 h-full w-0.5 bg-aps1"></div>
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
        searchResultComponent={LinkSuggestionItem}
        searchCallback={onMentionSearch}
        shortcutTrigger="@"
        on:select={onMentionSelect}
        on:reset={() => {
          hidePopover("mentionSearch");
        }}
      />
    {/if}
  </slot>
</Popover>
