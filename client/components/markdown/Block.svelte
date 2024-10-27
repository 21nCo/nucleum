<script lang="ts">
  import {
    BlockAction,
    type IBlock,
    type IMarkdownStore
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
    webNodeTypeList
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
    if (action === BlockAction.CONVERT) {
      const fromType = block.contentType;
      if (
        mediaNodeTypeList.includes(data.toType) ||
        webNodeTypeList.includes(data.toType) ||
        embedNodeTypeList.includes(data.toType)
      ) {
        block.contentType = NodeType.EMBED;
        const subType = data.toType;
        block.body = {
          subType
        };
        data.toType = NodeType.EMBED;
        data.body = {
          subType
        };
      } else {
        block.contentType = data.toType;
      }
      if (data.params?.listType) block.listType = data.params?.listType;
      propagateAsAction(action, { ...data, fromType });
      if (data.body) {
        propagate(BlockAction.CHANGE, { body: data.body });
      }
    } else if (action === BlockAction.DELETE) {
      mdStore.deleteBlock(block.id);
      propagateAsAction(action, {});
    } else if (action === BlockAction.INSERT) {
      let newBlockId;
      if (
        data?.blockType &&
        (mediaNodeTypeList.includes(data.blockType) ||
          webNodeTypeList.includes(data.blockType) ||
          embedNodeTypeList.includes(data.blockType))
      ) {
        const subType = data.blockType;
        data.blockType = NodeType.EMBED;
        data.body = {
          subType
        };
      }
      if (data?.blockType && structuralNodeTypes.includes(data.blockType)) {
        newBlockId = mdStore.insertStructualBlock(
          block.id,
          data.blockType as StructuralNodeType
        );
      } else newBlockId = mdStore.insert({ source: block.id, ...data });
      propagateAsAction(action, { ...data, id: newBlockId });
    } else if (
      action === BlockAction.MOVEUP ||
      action === BlockAction.MOVEDOWN
    ) {
      mdStore.move(block.id, action);
      propagateAsAction(action, data);
    } else if (action === BlockAction.DUPLICATE) {
      const newBlock = mdStore.duplicate(block.id);
      propagateAsAction(action, newBlock);
    } else if (action === BlockAction.COPY_BLOCK_TEXT) {
      copyToClipboard(block.body);
      toasts.success("Block copied to clipboard");
    } else if (action === BlockAction.EMBED_PREVIEW_TOGGLE) {
      block.body.isHidePreview = data.isHidePreview;
      propagate(BlockAction.CHANGE, {
        body: {
          isHidePreview: data.isHidePreview
        }
      });
    } else {
      propagate(action, data);
    }
  }
  const blockContext = {
    publish: blockContextEventListener
  };
  setContext("block", blockContext);

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
