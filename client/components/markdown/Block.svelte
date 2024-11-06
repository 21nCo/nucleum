<script lang="ts">
  import {
    BlockAction,
    type IBlock,
    type IBlockBody,
    type IListBlockBody,
    type IMarkdownStore,
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

  export let block: IBlock;
  export let mdStore: MdStoreType;
  let isHovering: boolean = false;
  let isFocusing: boolean = false;
  let isReRendering: boolean = false;
  let dev_isShowFocusHintOnRight: boolean = false;
  $: isFocusable =
    $mdStore.params?.isNodular && headingNodeTypes.includes(block.contentType);

  $: isShowLeftControls =
    $mdStore.params?.isNodular &&
    !$mdStore.params?.isReadOnly &&
    !$view.isConstrainedWidth;

  const markdownContext = getContext<any>("markdown");

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
        if (
          !simpleTextNodeTypeList.includes(block.contentType) ||
          typeof block.body !== "string"
        )
          return;
        copyToClipboard(block.body);
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

      default:
        propagate(action, data);
        break;
    }
  }
  const blockContext = {
    publish: blockContextEventListener
  };
  setContext("block", blockContext);

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

    /**
     * Resolves body text for simple text and non simple text node types
     */
    function resolveBodyText(): string | undefined {
      if (simpleTextNodeTypeList.includes(block.contentType))
        return block.body as string;
      else if (nonSimpleTextNodeTypeList.includes(block.contentType))
        return (block.body as INonSimpleTextBlockBody).text;
      else if (headingNodeTypes.includes(block.contentType)) {
        return block.label ?? block.body;
      }
    }
  }

  /**
   * @param data
   */
  function handleInsertAction(data: any) {
    let newBlockId;
    //TODO - case when enter pressed in the middle of the block with text on the right side of the caret
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
      data.body = "";
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
        text: "",
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

  onMount(() => {
    //TODO - check the need for rerendering
    const mdStoreSub = mdStore.subscribe((md: IMarkdownStore) => {
      // console.log("re-render block", md.reRenderBlock);
      if (md.reRenderBlock === block.id) {
        // console.log("re-rendering block", block.id);
        isReRendering = true;
        setTimeout(() => {
          isReRendering = false;
        }, 0.1);
      }
    });
    return () => {
      mdStoreSub();
    };
  });

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
</script>

<!--TODO -  Note - when reenabling drag and drag to rearrange - make sure it is not interfering with text selection or media grid space slider -->
<div
  class={cn(
    "w-full min-h-fit items-center gap-2 rounded-md border border-transparent",
    {
      "grid grid-cols-[2.5rem_1fr]": isShowLeftControls
    },
    $mdStore.params?.isNodular &&
      !$mdStore.params?.isReadOnly && {
        "bg-bgs2 bg-opacity-50 !border-brs1": isHovering && !isFocusing
        // "!border-brs1": isHovering && isFocusing
      }
  )}
  draggable="false"
  data-content={block.contentType}
  data-node={block.id}
  use:hoverable={{
    onHover: (e) => {
      isHovering = e;
      if (isHovering) {
        dispatchCustomEvent(MemotronEvent.BLOCK_HOVER, { id: block.id });
      }
    }
  }}
>
  {#if isShowLeftControls}
    <LeftControls
      {mdStore}
      {block}
      {isFocusing}
      isBlockHovering={isHovering}
      on:nodularize
      on:action={onContextMenuAction}
    />
  {/if}
  <div class="relative flex-1">
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
    {#if isHovering && isFocusable && !isFocusing && dev_isShowFocusHintOnRight}
      <div
        class="absolute top-0 right-0 flex h-full items-center justify-center bg-gradient-to-r from-bgs2/40 via-bgs2 to-bgs2 pl-32"
      >
        <span class="text-b3 text-fgs1 rounded-md px-2 py-1">
          Click
          <FocusRing isHint={true} />
          to focus
        </span>
      </div>
    {/if}
  </div>
</div>
