<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import {
    BlockAction,
    type IBlock
  } from "$lib/client/components/markdown/md.type";
  import {
    headingNodeTypes,
    mediaNodeTypeList,
    NodeType,
    structuralNodeTypes,
    webNodeTypeList
  } from "$lib/client/products/memotron/node/node.type";
  import { createEventDispatcher, onMount } from "svelte";
  import type { MdStoreType } from "../markdown.store";
  import { Size } from "$lib/client/types/size.enum";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import {
    ContextMenuType,
    type IContextMenu,
    type IContextMenuItem
  } from "$lib/client/types/select.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import FocusRing from "./FocusRing.svelte";
  import BlockBrowser from "../blockBrowser/BlockBrowser.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import {
    ResourceAccessMode,
    ResourceActionType
  } from "../../flux/resourceStores/resource.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { Action } from "$lib/client/types/action.enum";
  import { MemotronEvent } from "$lib/client/products/memotron/memotron.type";
  import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
  import { tabs } from "$lib/client/layout/topNav/tabs/tabs.store";
  import { popover, tooltip } from "$lib/client/actions/popover.action";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import {
    parseAndFormatDate,
    formatDatetime
  } from "$lib/client/utils/time.utils";
  import { userPreferences } from "../../settings/userPreferences.store";
  import { resolveResourceActionIcon } from "../../flux/resourceStores/resource.utils";
  const dispatch = createEventDispatcher();
  export let block: IBlock;
  export let isFocusing: boolean = false;
  export let isBlockHovering: boolean = false;
  export let isDisableTooltip: boolean = false;
  export let isSoleBlock: boolean = false;
  export let isNodularizable: boolean = false;
  let isHovering: boolean = false;
  let isPopoverVisible: boolean = false;
  let contextMenuRef: any;

  $: isDebugLeftControls = false;

  const actions: Record<string, IContextMenuItem> = {
    [BlockAction.CONVERT]: {
      value: BlockAction.CONVERT,
      label: "Turn into",
      icon: resolveResourceActionIcon(ResourceActionType.CONVERT),
      secondStepComponent: {
        component: BlockBrowser,
        props: {
          isSingleColumnMode: true,
          onSelect: async (props?: any) => {
            dispatch("action", {
              action: BlockAction.CONVERT,
              data: {
                toType: props?.type
              }
            });
            hideContextMenu();
          }
        }
      }
    },
    [BlockAction.DUPLICATE]: {
      value: BlockAction.DUPLICATE,
      icon: resolveResourceActionIcon(ResourceActionType.DUPLICATE),
      callback: async () => {
        dispatch("action", { action: BlockAction.DUPLICATE });
      }
    },
    [BlockAction.LINK]: {
      value: BlockAction.LINK,
      icon: resolveResourceActionIcon(ResourceActionType.LINK),
      callback: async () => {},
      secondStepComponent: {
        component: BlockBrowser
      }
    },
    [BlockAction.COPY_LINK]: {
      value: BlockAction.COPY_LINK,
      icon: resolveResourceActionIcon(ResourceActionType.COPY_LINK),
      callback: async () => {}
    },
    [BlockAction.INSERT]: {
      value: BlockAction.INSERT,
      icon: "insert-down",
      secondStepComponent: {
        component: BlockBrowser,
        props: {
          isSingleColumnMode: true,
          onSelect: async (props?: any) => {
            dispatch("action", {
              action: BlockAction.INSERT,
              data: {
                blockType: props?.type
              }
            });
            hideContextMenu();
          }
        }
      }
    },
    [BlockAction.INSERT_ABOVE]: {
      value: BlockAction.INSERT_ABOVE,
      icon: "arrow-up",
      callback: async () => {}
    },
    [BlockAction.INSERT_BELOW]: {
      value: BlockAction.INSERT_BELOW,
      icon: "arrow-down",
      callback: async () => {}
    },
    [BlockAction.COPY_BLOCK_TEXT]: {
      value: BlockAction.COPY_BLOCK_TEXT,
      icon: resolveResourceActionIcon(ResourceActionType.COPY_CONTENTS),
      callback: async () => {
        dispatch("action", { action: BlockAction.COPY_BLOCK_TEXT });
      }
    },
    [BlockAction.GO_TO_EXTERNAL_LINK]: {
      value: BlockAction.GO_TO_EXTERNAL_LINK,
      icon: "arrow-up-right",
      callback: async () => {
        dispatch("action", { action: BlockAction.GO_TO_EXTERNAL_LINK });
      }
    },
    [BlockAction.DELETE]: {
      value: BlockAction.DELETE,
      icon: resolveResourceActionIcon(ResourceActionType.DELETE),
      callback: async () => {
        dispatch("action", { action: BlockAction.DELETE });
      }
    },
    [BlockAction.FOCUS]: {
      value: BlockAction.FOCUS,
      icon: "circle",
      callback: async () => {
        onNodularize();
      }
    },
    [BlockAction.OPEN_AS_SPLIT]: {
      value: BlockAction.OPEN_AS_SPLIT,
      icon: "split",
      callback: async () => {
        appStore.openResource(block.id, ResourceAccessMode.FSPLIT);
      }
    },
    [BlockAction.OPEN_IN_FULL_SCREEN]: {
      value: BlockAction.OPEN_IN_FULL_SCREEN,
      icon: "arrows-out",
      callback: async () => {
        // appStore.closeResource({ isRestrictToModals: true });
        appStore.openResource(block.id, ResourceAccessMode.FULL);
      }
    },
    [BlockAction.OPEN_AS_TAB]: {
      value: BlockAction.OPEN_AS_TAB,
      icon: "tabs",
      callback: async () => {
        tabs.open(block.id);
      }
    },
    [BlockAction.COLOR]: {
      value: BlockAction.COLOR,
      icon: "palette",
      callback: async () => {},
      secondStepComponent: {
        component: BlockBrowser
      }
    },
    [BlockAction.CALLOUT_SETTINGS]: {
      value: BlockAction.CALLOUT_SETTINGS,
      icon: "bookmark",
      callback: async () => {},
      secondStepComponent: {
        component: BlockBrowser
      }
    },
    [BlockAction.SHORTCUTS]: {
      value: BlockAction.SHORTCUTS,
      icon: "command",
      action: Action.MARKDOWN_SHORTCUTS
    },
    [BlockAction.DOWNLOAD]: {
      value: BlockAction.DOWNLOAD,
      icon: "download",
      callback: async () => {
        nodeStore.download(block.body.id);
      }
    }
  };

  function resolveEmbedPreviewToggleAction() {
    return {
      value: BlockAction.EMBED_PREVIEW_TOGGLE,
      icon: "eye-slash",
      label: "Hide preview",
      type: ContextMenuType.SWITCH,
      initialValue: block.body?.isHidePreview ?? false,
      callback: async (checked) => {
        dispatch("action", {
          action: BlockAction.EMBED_PREVIEW_TOGGLE,
          data: {
            isHidePreview: checked
          }
        });
        hideContextMenu();
      }
    };
  }

  /**
   *
   *
   * TODO
   * * Resolve state propagation if a heading node is opened as split (Disabled for now)
   *
   *
   * @param block
   */
  function resolveContextMenu(
    block: IBlock,
    isSoleBlock?: boolean
  ): IContextMenu {
    const isStructuralBlock = structuralNodeTypes.includes(block.contentType);
    const isHeadingBlock = headingNodeTypes.includes(block.contentType);
    let items = [];
    if (isHeadingBlock) {
      items = [
        {
          group: "base",
          items: [
            actions[BlockAction.FOCUS],
            actions[BlockAction.CONVERT],
            actions[BlockAction.INSERT],
            // actions[BlockAction.LINK],
            actions[BlockAction.DUPLICATE]
          ]
        },
        {
          group: "more",
          items: [
            // actions[BlockAction.COPY_LINK],
            actions[BlockAction.COPY_BLOCK_TEXT],
            // actions[BlockAction.OPEN_AS_SPLIT],
            actions[BlockAction.OPEN_IN_FULL_SCREEN],
            actions[BlockAction.OPEN_AS_TAB],
            actions[BlockAction.SHORTCUTS]
          ]
        }
      ];
    } else if (isStructuralBlock) {
      items = [
        {
          group: "base",
          items: [
            actions[BlockAction.CONVERT],
            actions[BlockAction.INSERT],
            actions[BlockAction.DUPLICATE]
          ]
        },
        {
          group: "more",
          items: [actions[BlockAction.SHORTCUTS]]
        }
      ];
    } else {
      items = [
        {
          group: "base",
          items: [
            actions[BlockAction.CONVERT],
            actions[BlockAction.INSERT],
            // block.contentType === NodeType.CALLOUT
            //   ? actions[BlockAction.CALLOUT_SETTINGS]
            //   : actions[BlockAction.COLOR],
            // actions[BlockAction.LINK],
            actions[BlockAction.DUPLICATE]
          ]
        },
        {
          group: "more",
          items: [
            // actions[BlockAction.COPY_LINK],
            actions[BlockAction.COPY_BLOCK_TEXT],
            actions[BlockAction.SHORTCUTS]
          ]
        }
      ];
    }

    if (!isSoleBlock) {
      items.forEach((group) => {
        if (group.group === "more") {
          group.items.push(actions[BlockAction.DELETE]);
        }
      });
    }
    if ("body" in block && block.body && block.contentType === NodeType.EMBED) {
      if (block.body.id && mediaNodeTypeList.includes(block.body.subType)) {
        items.forEach((group) => {
          if (group.group === "base") {
            group.items.push(actions[BlockAction.DOWNLOAD]);
          }
        });
      }
      if (
        block.body.subType === NodeType.WEB_PAGE ||
        block.body.subType === NodeType.PDF ||
        block.body.subType === NodeType.GIST ||
        block.body.subType === NodeType.YOUTUBE_VIDEO
      ) {
        items.forEach((group) => {
          if (group.group === "base") {
            group.items.push(resolveEmbedPreviewToggleAction());
          }
        });
      }
      if (block.body.subType && webNodeTypeList.includes(block.body.subType)) {
        items.forEach((group) => {
          if (group.group === "base") {
            group.items.push(actions[BlockAction.GO_TO_EXTERNAL_LINK]);
          }
        });
      }
    }
    return items;
  }

  function onNodularize(e?: MouseEvent) {
    dispatch("nodularize", { id: block.id });
    e?.stopPropagation();
  }

  onMount(() => {
    window.addEventListener(
      MemotronEvent.BLOCK_HOVER,
      onOtherBlocksHoverListener
    );
    return () => {
      window.removeEventListener(
        MemotronEvent.BLOCK_HOVER,
        onOtherBlocksHoverListener
      );
    };
  });

  /**
   * Disabling this for time being as it is resulting in premature closing of popover when the width of the screen is less and the popover is opening over blocks and when secondary popover is opened on the right, the gap between popovers is getting tiggered as hover event on other blocks.
   * @param e
   */
  function onOtherBlocksHoverListener(e: any) {
    if (!e.detail || e.detail.id === block.id) return;
    return;
    if (isPopoverVisible) {
      hideContextMenu();
    }
  }
  function hideContextMenu() {
    contextMenuRef.dispatchEvent(new CustomEvent("hide"));
  }
</script>

<div
  class={cn("h-full w-full flex justify-center rounded-l-md border", {
    "bg-bgs3 border-brs2": isHovering,
    "border-transparent": !isHovering
  })}
  use:popover={{
    placement: Placement.Left,
    content: ContextMenu,
    triggerMethod: [PopoverTriggerMethod.CLICK],
    componentProps: {
      menuResolver: () => resolveContextMenu(block, isSoleBlock),
      size: Size.lg,
      heading: "Options",
      bottomRender: block.modifiedAt
        ? `<div class="flex justify-center py-1 items-center text-b3 text-fgs3 default-typeface">Last modified: ${formatDatetime($userPreferences, block.modifiedAt)}</div>`
        : "",
      onSelect: (e) => {
        hideContextMenu();
      }
    },
    id: "leftControls",
    groupId: "leftControlsGroup",
    offsetInPx: 8
  }}
  on:change={(e) => {
    isPopoverVisible = e?.detail?.open;
    dispatch("popoverVisibility", isPopoverVisible);
  }}
  bind:this={contextMenuRef}
  use:hoverable={{
    onHover: (e) => {
      isHovering = e;
      if (isHovering) {
        dispatchCustomEvent(MemotronEvent.BLOCK_HOVER, { id: block.id });
      }
    }
  }}
>
  <button
    class="flex w-full h-full items-center justify-center"
    use:tooltip={{
      disabled: isDisableTooltip || isPopoverVisible,
      text: isNodularizable
        ? "Click ring to zoom in"
        : "Drag to rearrange / Click for options",
      direction: Placement.Bottom,
      delay: 500
    }}
  >
    {#if isNodularizable && (isBlockHovering || isDebugLeftControls || isPopoverVisible || isHovering || isFocusing)}
      <FocusRing on:click={onNodularize} />
      <!-- {:else if isNodularizable && isFocusing}
      <FocusRing isFocusing={true} on:click={onNodularize} /> -->
    {:else}
      <span
        class={cn("flex w-full h-full justify-center items-center", {
          "opacity-100":
            isBlockHovering ||
            isDebugLeftControls ||
            isPopoverVisible ||
            isHovering ||
            isFocusing,
          "opacity-0": !(
            isBlockHovering ||
            isDebugLeftControls ||
            isPopoverVisible ||
            isHovering ||
            isFocusing
          )
        })}
      >
        <Icon icon="rearrange" size={Size.lg} class="fill-fgs3" />
      </span>
    {/if}
  </button>
</div>
