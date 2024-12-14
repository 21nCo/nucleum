<script lang="ts">
  import {
    BlockAction,
    type IBlock,
    type IBlockBody,
    type IListBlockBody,
    type INonSimpleTextBlockBody
  } from "$lib/client/components/markdown/md.type";
  import { getContext, onMount } from "svelte";
  import BlockContent from "./content/BlockContent.svelte";
  import LeftControls from "./contextMenu/LeftControls.svelte";
  import type { MdStoreType } from "./markdown.store";
  import {
    embedNodeTypeList,
    headingNodeTypes,
    mediaNodeTypeList,
    NodeType,
    type StructuralNodeType,
    structuralNodeTypes,
    simpleTextNodeTypeList,
    webNodeTypeList,
    nonSimpleTextNodeTypeList,
    listNodeTypes
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { setContext } from "svelte";
  import { logger } from "../debug/logger.client";
  import FocusRing from "./contextMenu/FocusRing.svelte";
  import { copyToClipboard } from "$lib/client/utils/utils";
  import { toasts } from "$lib/client/stores/notification.store";
  import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
  import { MemotronEvent } from "$lib/client/products/memotron/memotron.type";
  import { hoverable } from "$lib/client/actions/hover.action";
  import view from "$lib/client/stores/view.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { isSameResource } from "../flux/resourceStores/resource.utils";
  import {
    resolvePlainOffsetForMdEnd,
    resolvePlainText,
    splitMarkdownAtPlainOffset
  } from "./markdown.utils";
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { MAX_FILE_SIZE_MB } from "$lib/client/products/memotron/memotron.store";
  import { resolveFileUploadErrorMessage } from "$lib/client/products/memotron/memotron.utils";
  import { generateResourceId } from "../flux/flux.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { resolveMultipleFilesData } from "$lib/client/products/memotron/capture/capture.utils";

  export let block: IBlock;
  export let mdStore: MdStoreType;
  let isHovering: boolean = false;
  let isFocusing: boolean = false;
  let contentRefreshId: number = new Date().getTime();
  let isDragging: boolean = false;
  let progressState: string | undefined = undefined;
  $: isFocusable =
    $mdStore.params?.isNodular && headingNodeTypes.includes(block.contentType);

  $: isLeftControlsEnabled =
    $mdStore.params?.isNodular && !$view.isConstrainedWidth;

  const markdownContext = getContext<any>("markdown");
  const nodeContext = getContext<any>("node");
  const contentContext = getContext<any>("content");

  function propagate(event: string, data: any) {
    markdownContext({
      event,
      data: {
        ...data,
        source: block.id
      }
    });
  }
  function propagateAsAction(action: string, data: any) {
    markdownContext({
      event: "action",
      data: {
        ...data,
        source: block.id,
        action
      }
    });
  }

  onMount(() => {
    mdStore?.alter?.subscribe((b) => {
      if (b && isSameResource(b, block.id)) {
        block = b;
        if (headingNodeTypes.includes(b.contentType)) {
          propagate(BlockAction.CHANGE, { label: b.label });
        } else {
          propagate(BlockAction.CHANGE, { body: b.body });
        }
        contentRefreshId = new Date().getTime();
      }
    });
  });

  function blockContextEventListener(action: BlockAction, data: any) {
    logger.log({ at: "blockContextEventListener", action, data, block });
    if (!action) return;

    switch (action) {
      case BlockAction.CONVERT:
        handleConvertAction(data);
        break;

      case BlockAction.DELETE:
        mdStore.deleteBlock(block.id);
        propagateAsAction(action, {});
        break;

      case BlockAction.INSERT:
        handleInsertAction(data);
        break;

      case BlockAction.PASTE:
        handlePaste(data);
        break;

      case BlockAction.MOVEUP:
      case BlockAction.MOVEDOWN:
        const changedBlocks = mdStore.move(block.id, action);
        if (changedBlocks && changedBlocks.length > 0) {
          changedBlocks.forEach((b) => {
            propagate(BlockAction.CHANGE, { id: b.id, body: b.body });
          });
        }
        propagateAsAction(action, data);
        break;

      case BlockAction.DUPLICATE: {
        const newBlock = mdStore.duplicate(block.id);
        propagateAsAction(action, newBlock);
        break;
      }

      case BlockAction.TAB:
      case BlockAction.SHIFT_TAB:
        handleTabAction(action);
        break;

      case BlockAction.COPY_BLOCK_TEXT:
        const text = resolveBodyText();
        if (!text) return;
        copyToClipboard(text);
        toasts.success("Block copied to clipboard");
        break;

      case BlockAction.EMBED_PREVIEW_TOGGLE:
        if (block.contentType === NodeType.EMBED) {
          block.body.isHidePreview = data.isHidePreview;
          propagate(BlockAction.CHANGE, {
            body: { isHidePreview: data.isHidePreview }
          });
        }
        break;

      case BlockAction.BACKSPACE_WITH_CONTENT:
        handleBackspaceWithContent();
        break;

      default:
        propagate(action, data);
        break;
    }
  }
  const blockContext = {
    publish: blockContextEventListener
  };
  setContext("block", blockContext);

  function handleBackspaceWithContent() {
    const currentBlockText = resolveBodyText();
    const previousBlock = mdStore.getPreviousSibling(block.id);
    const previousBlockText = resolveBodyText(previousBlock);
    const offset = resolvePlainOffsetForMdEnd(previousBlockText ?? "");
    if (
      !currentBlockText ||
      !previousBlock ||
      ![
        ...simpleTextNodeTypeList,
        ...nonSimpleTextNodeTypeList,
        ...headingNodeTypes
      ].includes(previousBlock.contentType)
    ) {
      return;
    }
    const modifiedPreviousBlockText = editBlockText(
      previousBlock,
      currentBlockText,
      { isAppend: true }
    );
    if (headingNodeTypes.includes(previousBlock.contentType)) {
      previousBlock.label = modifiedPreviousBlockText as string;
    } else {
      previousBlock.body = modifiedPreviousBlockText;
    }
    mdStore.alterBlock(previousBlock);
    mdStore.focusBlock(previousBlock.id, { xOffset: offset });
    mdStore.deleteBlock(block.id, { isPreventFocus: true });
    propagateAsAction(BlockAction.DELETE, {});
  }

  function handleConvertAction(data: any) {
    const fromType = block.contentType;
    if (
      mediaNodeTypeList.includes(data.toType) ||
      webNodeTypeList.includes(data.toType) ||
      embedNodeTypeList.includes(data.toType)
    ) {
      const subType = data.toType;
      data.toType = NodeType.EMBED;
      data.body = { subType };
    } else if (simpleTextNodeTypeList.includes(data.toType)) {
      const text = resolveBodyText() ?? "";
      data.body = text;
    } else if (nonSimpleTextNodeTypeList.includes(data.toType)) {
      const text: string = resolveBodyText() ?? "";
      const body = resolveDefaultBody(data.toType, text);
      data.body = body;
    } else if (headingNodeTypes.includes(data.toType)) {
      const text: string = resolveBodyText() ?? "";
      // block.body = null;
      data.label = text;
    }
    block.contentType = data.toType;
    if (data.body) block.body = data.body;
    logger.log({ at: "handleConvertAction - data", data, fromType });
    propagateAsAction(BlockAction.CONVERT, { ...data, fromType });
    if (data.body !== undefined) {
      block.body = data.body;
      propagate(BlockAction.CHANGE, { body: data.body });
    }
    if (data.label !== undefined) {
      block.label = data.label;
      propagate(BlockAction.CHANGE, { label: data.label });
    }
    if (
      data.toType === NodeType.EMBED ||
      structuralNodeTypes.includes(data.toType)
    ) {
      insertBufferBlockIfRequired(block.id);
    }
    mdStore.focusBlock(block.id, { xOffset: 0 });
  }

  /**
   * Resolves body text for simple text and non simple text node types
   */
  function resolveBodyText(blockParam?: IBlock): string | undefined {
    const blockObj = blockParam ?? block;
    if (simpleTextNodeTypeList.includes(blockObj.contentType))
      return blockObj.body as string;
    else if (nonSimpleTextNodeTypeList.includes(blockObj.contentType))
      return (blockObj.body as INonSimpleTextBlockBody).text;
    else if (headingNodeTypes.includes(blockObj.contentType)) {
      return blockObj.label ?? blockObj.body;
    }
  }

  /**
   * Handles insert action for block
   *
   * If data.blockType is not present, checks whether the caret position is in the middle of text and moves the text after the caret to the newly inserted block.
   * @param data
   */
  function handleInsertAction(data: any) {
    let newBlockId;
    let newText = "";
    if (data?.blockType) {
      if (
        mediaNodeTypeList.includes(data.blockType) ||
        webNodeTypeList.includes(data.blockType) ||
        embedNodeTypeList.includes(data.blockType)
      ) {
        const subType = data.blockType;
        data.blockType = NodeType.EMBED;
        data.body = { subType };
      } else if (nonSimpleTextNodeTypeList.includes(data.blockType)) {
        data.body = resolveDefaultBody(data.blockType, "");
      } else if (simpleTextNodeTypeList.includes(data.blockType)) {
        data.body = "";
      } else if (headingNodeTypes.includes(data.blockType)) {
        data.label = "";
      }
    } else {
      if (!data) data = {};
      data.blockType = NodeType.SIMPLE_TEXT;
      const currentBlockText = resolveBodyText();
      const plainText = resolvePlainText(currentBlockText ?? "");
      if (
        currentBlockText &&
        plainText &&
        data?.caretPosition &&
        data?.caretPosition.caretOffset < plainText.length
      ) {
        const { before, after } = splitMarkdownAtPlainOffset(
          currentBlockText,
          data?.caretPosition.caretOffset
        );
        newText = after;
        const preText = before;
        const modifiedBody = editBlockText(block, preText);
        if (headingNodeTypes.includes(block.contentType)) {
          block.label = modifiedBody as string;
          propagate(BlockAction.CHANGE, {
            label: modifiedBody as string
          });
        } else {
          block.body = modifiedBody;
          propagate(BlockAction.CHANGE, {
            body: modifiedBody
          });
        }
        contentRefreshId = new Date().getTime();
      }
      data.body = newText;
    }

    if (
      listNodeTypes.includes(block.contentType) &&
      (data.blockType === NodeType.SIMPLE_TEXT ||
        listNodeTypes.includes(data.blockType))
    ) {
      const currentBody = block.body as IListBlockBody;
      if (data.blockType === NodeType.SIMPLE_TEXT)
        data.blockType = block.contentType;
      data.body = {
        indent:
          Number.isNaN(currentBody.indent) || !currentBody.indent
            ? 0
            : currentBody.indent,
        text: newText,
        order: currentBody.order !== undefined ? currentBody.order + 1 : 1
      };
    }

    if (structuralNodeTypes.includes(data.blockType))
      newBlockId = mdStore.insertStructualBlock(
        block.id,
        data.blockType as StructuralNodeType
      );
    else newBlockId = mdStore.insert({ source: block.id, ...data });

    propagateAsAction(BlockAction.INSERT, { ...data, id: newBlockId });

    if (
      (data.blockType === NodeType.EMBED ||
        structuralNodeTypes.includes(data.blockType)) &&
      newBlockId
    ) {
      insertBufferBlockIfRequired(newBlockId);
    }
  }

  function insertBufferBlockIfRequired(newBlockId: IRecordId) {
    const isCurrentIsLastBlock = mdStore.isLastBlock(block.id);
    if (!isCurrentIsLastBlock) return;
    const bufferBlock = {
      blockType: NodeType.SIMPLE_TEXT,
      body: ""
    };
    const bufferBlockId = mdStore.insert({
      source: newBlockId,
      ...bufferBlock
    });
    propagateAsAction(BlockAction.INSERT, {
      ...bufferBlock,
      id: bufferBlockId
    });
  }

  function handleTabAction(action: BlockAction.TAB | BlockAction.SHIFT_TAB) {
    if (!listNodeTypes.includes(block.contentType)) return;

    const currentBody = block.body as IListBlockBody;
    const previousSibling = mdStore?.getPreviousSibling(block.id);
    if (
      !previousSibling ||
      !listNodeTypes.includes(previousSibling.contentType)
    )
      return;
    if (action === BlockAction.TAB) {
      currentBody.indent += 1;
    } else if (action === BlockAction.SHIFT_TAB) {
      if (currentBody.indent === 0) return;
      currentBody.indent -= 1;
    }
    let currentOrder = currentBody.order;
    if (
      block.contentType === NodeType.ORDERED_LIST &&
      previousSibling &&
      previousSibling.contentType === NodeType.ORDERED_LIST
    ) {
      const previousSiblingBody = previousSibling?.body as IListBlockBody;

      if (previousSiblingBody.indent === currentBody.indent) {
        currentBody.order = (previousSiblingBody.order ?? 0) + 1;
      } else if (previousSiblingBody.indent > currentBody.indent) {
        const previousListParent = mdStore?.getListParentOrdered(
          previousSibling.id,
          currentBody.indent
        );
        if (previousListParent) {
          currentBody.order =
            ((previousListParent.body as IListBlockBody)?.order ?? 0) + 1;
        } else {
          currentBody.order = 1;
        }
      } else {
        currentBody.order = 1;
      }
    }
    block.body = currentBody;
    if (block.contentType === NodeType.ORDERED_LIST) {
      const changedBlocks = mdStore.reconcileOrderedList(
        block.id,
        currentBody,
        action,
        currentOrder
      );
      if (changedBlocks && changedBlocks.length > 0) {
        changedBlocks.forEach((b) => {
          propagate(BlockAction.CHANGE, {
            id: b.id,
            body: b.body
          });
        });
      }
    }
    propagate(BlockAction.CHANGE, {
      body: {
        indent: currentBody.indent,
        order: currentBody.order
      }
    });
  }

  /**
   * Resolves default body for non simple node types
   * @param text
   * @param toType
   */
  function resolveDefaultBody(toType: NodeType, text: string): IBlockBody {
    switch (toType) {
      case NodeType.LIST:
      case NodeType.ORDERED_LIST:
      case NodeType.CHECKLIST:
        return { indent: 0, text, order: 1 };
      case NodeType.CODE:
      case NodeType.CALLOUT:
        return { text };
      default:
        return { text };
    }
  }

  function editBlockText(
    block: IBlock,
    newText: string,
    params?: { isAppend?: boolean }
  ) {
    switch (block.contentType) {
      case NodeType.LIST:
      case NodeType.ORDERED_LIST:
      case NodeType.CHECKLIST:
        return {
          ...(block.body as IListBlockBody),
          text: appendIfRequired(block.body.text, newText)
        };
      case NodeType.CODE:
      case NodeType.CALLOUT:
        return {
          ...(block.body as INonSimpleTextBlockBody),
          text: appendIfRequired(block.body.text, newText)
        };
      case NodeType.SIMPLE_TEXT:
      case NodeType.QUOTE:
        return appendIfRequired(block.body, newText);
      case NodeType.HEADING1:
      case NodeType.HEADING2:
      case NodeType.HEADING3:
      case NodeType.HEADING4:
      case NodeType.HEADING5:
        return appendIfRequired(block.label ?? "", newText);
      default:
        return newText;
    }

    function appendIfRequired(text: string, newText: string) {
      if (params?.isAppend) return text + newText;
      return newText;
    }
  }

  function onContextMenuAction(
    e: CustomEvent<{
      action: BlockAction;
      data: any;
    }>
  ) {
    blockContextEventListener(e.detail.action, e.detail.data);
  }

  function onBlockUpdate(e: CustomEvent<any>) {
    const detail: Partial<IBlockBody> = e?.detail;
    logger.log({ at: "onBlockUpdate", detail, block });
    if (!detail) return;
    if (
      headingNodeTypes.includes(block.contentType) &&
      typeof detail === "string"
    ) {
      block.label = detail;
      propagate(BlockAction.CHANGE, { label: detail });
      return;
    }

    if (block.body) {
      if (typeof detail === "object" && typeof block.body === "object") {
        block.body = {
          ...block.body,
          ...detail
        };
      } else if (typeof block.body === "string" && typeof detail === "string") {
        block.body = detail;
      }
    } else {
      block.body = detail as IBlockBody;
    }
    propagate(BlockAction.CHANGE, { body: detail });
  }

  /**
   * Handles paste event.
   * @param event
   */
  async function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    progressState = "Pasting";
    try {
      const items = event?.clipboardData?.items;
      if (!items) return;
      const itemArray = Array.from(items);
      const isCodeText = itemArray.some((i) => i.type === "vscode-editor-data");
      if (!isCodeText && items.length > 1) {
        await handlePasteForMultipleItems(event);
        return;
      }
      const item = items[0];
      let newBlock: Pick<IBlock, "contentType" | "body"> | undefined;
      let fileEmbed: any;
      if (isCodeText) {
        const [text, metadataString] = await Promise.all([
          getAsStringPromise(itemArray.find((i) => i.type === "text/plain")),
          getAsStringPromise(
            itemArray.find((i) => i.type === "vscode-editor-data")
          )
        ]);
        let metadata;
        try {
          metadata = metadataString ? JSON.parse(metadataString) : null;
        } catch (e) {
          metadata = null;
        }

        newBlock = {
          contentType: NodeType.CODE,
          body: {
            text,
            language: metadata?.mode
          }
        };
      } else if (item?.type === "text/plain") {
        handlePasteForSimpleText(item);
        return;
      } else {
        const blob = items[0].getAsFile();
        if (!blob) {
          throw new Error("blob not found");
        }
        fileEmbed = await captureStore.saveFile(blob, undefined, {
          isEmbedContext: true,
          creationContext: nodeContext?.id ?? undefined
        });
        if (!fileEmbed || fileEmbed.error || !("id" in fileEmbed)) {
          throw new Error("captureStore.saveFile failed");
        }
        newBlock = {
          contentType: NodeType.EMBED,
          body: {
            id: fileEmbed.id,
            subType: fileEmbed.contentType
          }
        };
      }
      processPasteOrDrop(newBlock, fileEmbed);
    } catch (e) {
      logger.error({ at: "handlePaste", error: e });
      toasts.error("Failed to paste. Please try again.");
    } finally {
      progressState = undefined;
      event.preventDefault();
    }

    async function handlePasteForSimpleText(item: DataTransferItem) {
      //TODO - code text detection, if current is not text block case
      item.getAsString((text) => {
        const modifiedBlockText = editBlockText(block, text, {
          isAppend: true
        });
        console.log("modifiedBlockText", modifiedBlockText);
        block.body = modifiedBlockText;
        propagate(BlockAction.CHANGE, { body: modifiedBlockText });
        contentRefreshId = new Date().getTime();
        mdStore.focusBlock(block.id, { isBottom: true });
      });
    }

    function getAsStringPromise(item?: DataTransferItem): Promise<string> {
      return new Promise((resolve) => {
        if (!item) {
          resolve("");
          return;
        }
        item.getAsString((value) => resolve(value));
      });
    }

    function handlePasteForMultipleItems(event: ClipboardEvent) {
      const filesData = event?.clipboardData?.files;
      if (!filesData) return;
      let allFiles = Array.from(filesData);
      return insertMultipleFiles(allFiles);
    }
  }

  /**
   * Processes paste or drop event - inserts new block if the current block is not empty or converts to new block type
   * @param newBlock
   * @param fileEmbed
   */
  function processPasteOrDrop(
    newBlock: Pick<IBlock, "contentType" | "body">,
    fileEmbed?: any
  ) {
    if (!newBlock) return;
    if (
      block.contentType === NodeType.SIMPLE_TEXT &&
      !isValidString(block.body)
    ) {
      convert(newBlock, fileEmbed);
      return;
    }
    insert(newBlock, fileEmbed);

    function convert(
      newBlock: Pick<IBlock, "contentType" | "body">,
      fileEmbed?: any
    ) {
      block.contentType = newBlock.contentType;
      propagateAsAction(BlockAction.CONVERT, {
        fromType: block.contentType,
        toType: newBlock.contentType
      });
      block.body = newBlock.body;
      propagate(BlockAction.CHANGE, {
        body: newBlock.body
      });
      insertBufferBlockIfRequired(block.id);
      if (fileEmbed) {
        addMention(fileEmbed, block.id);
      }
    }

    function insert(
      newBlock: Pick<IBlock, "contentType" | "body">,
      fileEmbed?: any
    ) {
      //TODO - case of pasting link for inline links
      let data = {
        blockType: newBlock?.contentType,
        body: newBlock?.body
      };
      const newBlockId = mdStore.insert({ source: block.id, ...data });
      if (!newBlockId) {
        throw new Error("mdStore.insert failed");
      }
      propagateAsAction(BlockAction.INSERT, { ...data, id: newBlockId });
      insertBufferBlockIfRequired(newBlockId);
      if (fileEmbed) {
        addMention(fileEmbed, newBlockId);
      }
    }
  }

  function addMention(fileEmbed: any, location: IRecordId) {
    contentContext.publish("mention", {
      location,
      item: fileEmbed
    });
  }

  async function handleFileDrop(
    all: File[],
    valid: File[],
    errors: { file: File; type: string }[]
  ) {
    try {
      if (errors && errors.length > 0) {
        let error = resolveFileUploadErrorMessage(errors, {
          maxFileSizeMB: MAX_FILE_SIZE_MB
        });
        toasts.error(error);
        return;
      }
      if (all.length === 0) return;
      progressState = "Uploading";
      if (all.length !== 1) {
        await insertMultipleFiles(all);
        return;
      }
      let file = all[0];
      const fileEmbed = await captureStore.saveFile(file, undefined, {
        isEmbedContext: true,
        creationContext: nodeContext?.id ?? undefined
      });
      if (!fileEmbed || fileEmbed.error || !("id" in fileEmbed)) {
        throw new Error("captureStore.saveFile failed");
      }
      let newBlock: Pick<IBlock, "contentType" | "body"> = {
        contentType: NodeType.EMBED,
        body: {
          id: fileEmbed.id,
          subType: fileEmbed.contentType
        }
      };
      processPasteOrDrop(newBlock, fileEmbed);
    } catch (e) {
      logger.error({ at: "handleFileDrop", error: e });
      toasts.error("Failed to upload. Please try again.");
    } finally {
      progressState = undefined;
    }
  }

  async function insertMultipleFiles(files: File[]) {
    logger.log({ at: "insertMultipleFiles", files });
    if (!files || files.length === 0) return;
    const multipleFilesData = resolveMultipleFilesData(files, MAX_FILE_SIZE_MB);
    if (multipleFilesData && multipleFilesData.sizeExceededCount > 0) {
      const error = `${multipleFilesData.sizeExceededCount} files exceed the maximum size of ${MAX_FILE_SIZE_MB} MB.`;
      toasts.error(error);
      return;
    }
    const result = await captureStore.saveMultipleFiles(
      multipleFilesData.files,
      {
        isEmbedContext: true,
        creationContext: nodeContext?.id
      }
    );
    if (!result) {
      throw new Error("captureStore.saveMultipleFiles failed");
    }
    const blocks: IBlock[] = result.map((x) => ({
      id: generateResourceId(Resource.node),
      contentType: NodeType.EMBED,
      body: {
        id: x.id,
        subType: x.contentType
      }
    }));
    mdStore.insertMany(block.id, blocks);
    propagateAsAction(BlockAction.INSERT_MANY, { blocks });
    insertBufferBlockIfRequired(blocks[blocks.length - 1].id);
    result.forEach((x, index) => {
      addMention(x, blocks[index].id);
    });
  }

  function resolveHeadingText(contentType: NodeType) {
    switch (contentType) {
      case NodeType.HEADING1:
        return "H1";
      case NodeType.HEADING2:
        return "H2";
      case NodeType.HEADING3:
        return "H3";
      case NodeType.HEADING4:
        return "H4";
      case NodeType.HEADING5:
        return "H5";
      default:
        return "";
    }
  }
</script>

<!--TODO -  Note - when reenabling drag and drag to rearrange - make sure it is not interfering with text selection or media grid space slider -->
<div
  class={cn(
    "w-full min-h-fit items-center gap-2 rounded-md border border-transparent",
    {
      "grid grid-cols-[2.5rem_1fr]": isLeftControlsEnabled,
      "opacity-50": isDragging
    },
    $mdStore.params?.isNodular &&
      !$mdStore.params?.isReadOnly && {
        "bg-bgs2 bg-opacity-50 !border-brs1": isHovering && !isFocusing
        // "!border-brs1": isHovering && isFocusing
      }
  )}
  draggable={!$mdStore.params?.isReadOnly && !isFocusing}
  data-index={block.id}
  data-id={block.id}
  data-content={block.contentType}
  data-node={block.id}
  on:dragstart={() => (isDragging = true)}
  on:dragend={() => (isDragging = false)}
  role="listitem"
  use:hoverable={{
    onHover: (e) => {
      isHovering = e;
      if (isHovering) {
        dispatchCustomEvent(MemotronEvent.BLOCK_HOVER, { id: block.id });
      }
    }
  }}
  use:fileDrop={{
    multiple: false,
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    onDrop: handleFileDrop,
    isPreventClickToBrowse: true
  }}
>
  {#if isLeftControlsEnabled}
    {#if $mdStore.params?.isReadOnly}
      <span />
    {:else}
      <LeftControls
        {mdStore}
        {block}
        {isFocusing}
        isDisableTooltip={isDragging}
        isBlockHovering={isHovering}
        on:nodularize
        on:action={onContextMenuAction}
      />
    {/if}
  {/if}

  <div class="relative flex-1">
    {#key contentRefreshId}
      <BlockContent
        {block}
        {mdStore}
        {isHovering}
        bind:isFocusing
        on:blur={() => {
          isHovering = false;
        }}
        on:update={onBlockUpdate}
      />
    {/key}
    {#if progressState}
      <div
        class="absolute inset-0 pr-3 bg-gradient-to-r from-transparent via-bgs2 to-transparent rounded-md flex gap-2 items-center justify-center"
      >
        <Icon icon="svg-spinners:3-dots-fade" />
        <span class="text-fgs3 text-b2">{progressState}</span>
      </div>
    {/if}
    {#if isHovering && isFocusable && !isFocusing}
      <div
        class="absolute inset-y-0 right-0 flex items-center justify-center bg-gradient-to-r from-bgs2/40 via-bgs2 to-bgs2 pl-32 pr-2"
      >
        <span class="text-b3 text-fgs1 rounded-md px-2 py-1 bg-bgs3">
          {resolveHeadingText(block.contentType)}
        </span>
      </div>
    {/if}
  </div>
</div>
