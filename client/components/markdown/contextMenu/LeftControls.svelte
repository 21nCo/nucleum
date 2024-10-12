<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import {
    BlockAction,
    type IBlock
  } from "$lib/client/components/markdown/md.type";
  import {
    headingNodeTypes,
    structuralNodeTypes
  } from "$lib/client/products/memotron/node/node.type";
  import { createEventDispatcher, onMount } from "svelte";
  import type { MdStoreType } from "../markdown.store";
  import { Size } from "$lib/client/types/size.enum";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import type {
    IContextMenu,
    IContextMenuItem
  } from "$lib/client/types/select.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import FocusRing from "./FocusRing.svelte";
  import { writable } from "svelte/store";
  import BlockBrowser from "../blockBrowser/BlockBrowser.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { Action } from "$lib/client/types/action.enum";
  import { MemotronEvent } from "$lib/client/products/memotron/memotron.type";
  import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
  import { tabs } from "$lib/client/layout/tabs/tabs.store";
  import { popover, tooltip } from "$lib/client/actions/popover.action";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { isSameResource } from "../../flux/resourceStores/resource.utils";
  const dispatch = createEventDispatcher();
  export let block: IBlock;
  export let mdStore: MdStoreType;
  export let isFocusing: boolean = false;
  export let isBlockHovering: boolean = false;
  let isHovering: boolean = false;
  let isPopoverVisible: boolean = false;
  let contextMenuRef: any;
  $: contextMenu = resolveContextMenu(block, isSoleBlock);

  $: isNodularizable = headingNodeTypes.includes(block.contentType);

  $: isDebugLeftControls = false;

  $: isSoleBlock =
    isSameResource($mdStore.blocks[0], block) && $mdStore.blocks.length === 1;

  const actions: Record<string, IContextMenuItem> = {
    [BlockAction.CONVERT]: {
      value: BlockAction.CONVERT,
      label: "Turn into",
      icon: "sync",
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
      icon: "ph:copy-light",
      callback: async () => {
        dispatch("action", { action: BlockAction.DUPLICATE });
      }
    },
    [BlockAction.LINK]: {
      value: BlockAction.LINK,
      icon: "arrow-up-right",
      callback: async () => {},
      secondStepComponent: {
        component: BlockBrowser
      }
    },
    [BlockAction.COPY_LINK]: {
      value: BlockAction.COPY_LINK,
      icon: "copy",
      callback: async () => {}
    },
    [BlockAction.INSERT]: {
      value: BlockAction.INSERT,
      icon: "arrow-down",
      secondStepComponent: {
        component: BlockBrowser,
        props: {
          isSingleColumnMode: true,
          onSelect: async (props?: any) => {
            console.log("insert", props);
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
      icon: "copy",
      callback: async () => {
        dispatch("action", { action: BlockAction.COPY_BLOCK_TEXT });
      }
    },
    [BlockAction.DELETE]: {
      value: BlockAction.DELETE,
      icon: "ph:trash",
      callback: async () => {
        dispatch("action", { action: BlockAction.DELETE });
      }
    },
    [BlockAction.FOCUS]: {
      value: BlockAction.FOCUS,
      icon: "node",
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
      icon: "full-screen",
      callback: async () => {
        appStore.closeResource({ isRestrictToModals: true });
        appStore.openResource(block.id, ResourceAccessMode.FULL);
      }
    },
    [BlockAction.OPEN_AS_TAB]: {
      value: BlockAction.OPEN_AS_TAB,
      icon: "ph:tabs-light",
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
    }
  };

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
  class={cn(
    "h-full w-full flex justify-center rounded-l-md border border-transparent hover:bg-bgs2 hover:border-brs2"
  )}
  use:popover={{
    placement: Placement.Left,
    content: ContextMenu,
    triggerMethod: PopoverTriggerMethod.CLICK,
    componentProps: {
      menu: contextMenu,
      size: Size.lg,
      heading: "Options",
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
      text: isNodularizable ? "Click ring to focus" : "More actions",
      direction: Placement.Bottom,
      delay: 500
    }}
  >
    {#if isNodularizable && !isFocusing}
      <FocusRing isFocusing={false} on:click={onNodularize} />
    {:else if isNodularizable && isFocusing}
      <FocusRing isFocusing={true} on:click={onNodularize} />
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
        <Icon icon="ph:dots-six-vertical" size={Size.lg} class="fill-fgs3" />
      </span>
    {/if}
  </button>
</div>
