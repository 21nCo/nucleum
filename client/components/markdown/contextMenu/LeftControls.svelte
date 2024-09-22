<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import {
    BlockAction,
    type IBlock
  } from "$lib/client/components/markdown/md.type";
  import {
    headingNodeTypes,
    NodeType,
    structuralNodeTypes
  } from "$lib/client/products/memotron/node/node.type";
  import { createEventDispatcher, onMount } from "svelte";
  import type { MdStoreType } from "../markdown.store";
  import { Size } from "$lib/client/types/size.enum";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import type {
    IContextMenu,
    IContextMenuItem
  } from "$lib/client/types/select.type";
  import { Position } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import FocusRing from "./FocusRing.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { writable } from "svelte/store";
  import BlockBrowser from "../blockBrowser/BlockBrowser.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { Action } from "$lib/client/types/action.enum";
  import { MemotronEvent } from "$lib/client/products/memotron/memotron.type";
  import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
  const dispatch = createEventDispatcher();
  export let block: IBlock;
  export let mdStore: MdStoreType;
  export let isFocusing: boolean = false;
  export let isBlockHovering: boolean = false;
  let isHovering: boolean = false;
  let isPopoverVisible: boolean = false;
  let contextMenuRef: any;
  $: contextMenu = resolveContextMenu(block);

  $: isNodularizable = headingNodeTypes.includes(block.contentType);

  $: isDebugLeftControls = false;
  // block.contentType === NodeType.QUOTE;
  //  headingNodeTypes.includes(block.contentType);

  function createDelayedFocusStore(delay = 300) {
    const { subscribe, set } = writable(false);
    let timeoutId: any;

    return {
      subscribe,
      setFocus: (value) => {
        if (value) {
          clearTimeout(timeoutId);
          set(true);
        } else {
          timeoutId = setTimeout(() => set(false), delay);
        }
      }
    };
  }

  /**
   *
   * Note: delayedFocus is used as immediate propagation of isFocusing state is resulting in the active grab icon being removed and click event not being registered and thus context menu not being opened.
   *
   */
  export const delayedFocus = createDelayedFocusStore();

  $: delayedFocus.setFocus(isFocusing);

  const actions: Record<string, IContextMenuItem> = {
    [BlockAction.CONVERT]: {
      value: BlockAction.CONVERT,
      label: "Turn into",
      icon: "sync",
      callback: async (props?: any) => {
        dispatch("action", {
          action: BlockAction.CONVERT,
          data: {
            toType: props?.type
          }
        });
      },
      secondStepComponent: {
        component: BlockBrowser,
        props: {
          isSingleColumnMode: true
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
      callback: async (props?: any) => {
        console.log("insert", props);
        dispatch("action", {
          action: BlockAction.INSERT,
          data: {
            blockType: props?.type
          }
        });
      },
      secondStepComponent: {
        component: BlockBrowser,
        props: {
          isSingleColumnMode: true
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
    [BlockAction.OPEN_IN_TOP_BAR]: {
      value: BlockAction.OPEN_IN_TOP_BAR,
      icon: "rocket",
      callback: async () => {
        appStore.closeResource({ isRestrictToModals: true });
        uiState.addResourceToTopBar(block.id);
        appStore.openResource(block.id, ResourceAccessMode.TOPBARFOCUS);
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
  function resolveContextMenu(block: IBlock): IContextMenu {
    const isStructuralBlock = structuralNodeTypes.includes(block.contentType);
    const isHeadingBlock = headingNodeTypes.includes(block.contentType);

    if (isHeadingBlock) {
      return [
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
            actions[BlockAction.OPEN_IN_TOP_BAR],
            actions[BlockAction.SHORTCUTS],
            actions[BlockAction.DELETE]
          ]
        }
      ];
    } else if (isStructuralBlock) {
      return [
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
          items: [actions[BlockAction.SHORTCUTS], actions[BlockAction.DELETE]]
        }
      ];
    } else {
      return [
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
            actions[BlockAction.SHORTCUTS],
            actions[BlockAction.DELETE]
          ]
        }
      ];
    }
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

  function onOtherBlocksHoverListener(e: any) {
    if (!e.detail || e.detail.id === block.id) return;
    if (isPopoverVisible) contextMenuRef?.hide();
  }
</script>

<HoverableElement
  bind:isHovering
  class={cn(
    "h-full w-full flex justify-center rounded-l-md border border-transparent hover:bg-bgs2 hover:border-brs2"
  )}
  on:hover={() => {
    if (isHovering) {
      dispatchCustomEvent(MemotronEvent.BLOCK_HOVER, { id: block.id });
    }
  }}
>
  <ContextMenuAction
    bind:this={contextMenuRef}
    id="leftControls"
    triggerMethod={PopoverTriggerMethod.CLICK}
    bind:isPopoverVisible
    {contextMenu}
    tooltip="More actions"
    heading="Options"
    size={Size.lg}
    position={Position.Left}
    offsetInPx={8}
    class="flex w-full h-full items-center justify-center"
  >
    <!-- Note: Directly using isFocusing is working -->
    {#if isNodularizable && !isFocusing}
      <FocusRing isFocusing={false} on:click={onNodularize} />
    {:else if isNodularizable && isFocusing}
      <FocusRing isFocusing={true} on:click={onNodularize} />
    {:else if $delayedFocus}
      <Icon icon="grab" size={Size.lg} class="fill-aps1" />
    {:else}
      <span
        class={cn("flex w-full h-full justify-center items-center", {
          "opacity-0":
            !isBlockHovering &&
            !isDebugLeftControls &&
            !isPopoverVisible &&
            !isHovering
        })}
      >
        <Icon icon="grab" size={Size.lg} class="fill-fgs3" />
      </span>
    {/if}
  </ContextMenuAction>
</HoverableElement>
