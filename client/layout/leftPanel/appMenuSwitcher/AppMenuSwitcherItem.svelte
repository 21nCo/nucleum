<script lang="ts">
  import { page } from "$app/stores";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import type { IAction } from "$lib/client/types/action.type";
  import { Size } from "$lib/client/types/size.enum";
  import { postMessageToParent } from "$lib/client/utils/embed.utils";
  import { Placement } from "$lib/client/types/direction.enum";
  import { abg, cn } from "$lib/client/utils/ui.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import {
    uiState,
    uiStateDerived
  } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import { keyboardShortcuts } from "$lib/client/components/shortcuts/shortcuts.store";
  import { popover, tooltip } from "$lib/client/actions/popover.action";
  import { hoverable } from "$lib/client/actions/hover.action";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { appMenuStore } from "$lib/client/stores/appMenu/appMenu.store";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import { isHideCreateAction } from "$lib/client/components/library/library.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  const dispatch = createEventDispatcher();
  export let item: IAction;
  export let layoutContext: LayoutContext = LayoutContext.DEFAULT;
  export let parentBackgroundIndex: number;
  $: isShowHotKeyHint =
    $uiStateDerived?.isShowHotKeyHints &&
    (layoutContext === LayoutContext.DEFAULT || hideMenuLabels);
  $: isActive =
    $page.params.route?.includes(item.path ?? item.action) ||
    $page.route.id?.includes(item.path ?? item.action);

  let hideMenuLabels = false;

  onMount(() => {
    uiStateDerived.refreshShortcutHintsState();
    refreshHideMenuLabels();
    const unsubscribe = uiState.subscribe(() => {
      refreshHideMenuLabels();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  function refreshHideMenuLabels() {
    hideMenuLabels =
      uiState.getState(UIState.hideLeftNavMenuLabels, {
        scope: UIStateScope.DAP
      }) || false;
  }

  $: isShowLabel =
    layoutContext === LayoutContext.PORTRAIT ||
    layoutContext === LayoutContext.DEFAULT ||
    (layoutContext === LayoutContext.THIN_WITH_LABEL && !hideMenuLabels);
  let buttonRef: HTMLElement;
  let popRef: HTMLButtonElement;
  let pad: number;
  let rive: any;
  let isOutlineStyle: boolean = false;
  let isHovering: boolean = false;
  $: if ($view.height) {
    let rawPad = ($view.width / 10) * $view.scale;
    pad = rawPad > 30 ? 30 : rawPad;
  }
  $: tooltipText =
    layoutContext === LayoutContext.THIN ||
    (layoutContext === LayoutContext.THIN_WITH_LABEL && !isShowLabel)
      ? `${item.label} ${resolveHotKey() ? `[**${resolveHotKey()?.toUpperCase()}**]` : ""}`
      : undefined;

  function onClick() {
    postMessageToParent(EmbedMessage.MENU_ITEM_SELECTED);
    rive?.fire();
    dispatch("click", {});
  }

  function onHover() {
    rive?.fire();
  }

  function resolveHotKey() {
    const shortcut = keyboardShortcuts.resolveShortcutForAction(item.action);
    if (!shortcut) return;
    return shortcut.key;
  }

  function resolveIconSize(layoutContext: LayoutContext) {
    if (
      layoutContext === LayoutContext.PORTRAIT ||
      layoutContext === LayoutContext.THIN_WITH_LABEL
    ) {
      return Size.lg;
    }
    if (layoutContext === LayoutContext.THIN) {
      return Size.md;
    }
    return Size.sm;
  }

  function resolveContextMenu() {
    const resource = item?.componentParams?.resource ?? Resource.unknown;
    const pinAction = {
      label: "Unpin from App menu",
      value: "pin",
      icon: "minus-circle",
      callback: async () => {
        appMenuStore.removeUserMenuItem(resource);
        popRef.dispatchEvent(new CustomEvent("hide"));
      }
    };
    const createAction = {
      label: "Create new",
      value: "create",
      icon: "plus",
      callback: async () => {
        appStore.runAction(resourceAction(resource, ResourceActionType.CREATE));
        popRef.dispatchEvent(new CustomEvent("hide"));
      }
    };
    if (isHideCreateAction(resource)) {
      return [
        {
          group: "all",
          items: [pinAction]
        }
      ];
    }
    return [
      {
        group: "all",
        items: [pinAction, createAction]
      }
    ];
  }

  function resolvePopover() {
    if (!item?.componentParams?.resource) return {};
    return {
      placement: Placement.BottomCenter,
      content: ContextMenu,
      triggerMethod: [PopoverTriggerMethod.RIGHT_CLICK],
      componentProps: { menuResolver: resolveContextMenu },
      id: "resourceSwitcherContextMenu",
      groupId: "resourceSwitcherContextMenuGroup"
    };
  }
</script>

<button
  bind:this={popRef}
  use:tooltip={{
    text: tooltipText ?? "",
    direction: Placement.Right
  }}
  class={cn(
    "appmenuitem flex items-center cursor-pointer w-full",
    (layoutContext === LayoutContext.DEFAULT ||
      layoutContext === LayoutContext.MINIMIZED) && {
      "bg-aps3 border-aps2 border text-aps1 hover:bg-aps2 hover:bg-opacity-70":
        isActive && isOutlineStyle,
      "hover:bg-bgs3": !isActive,
      [abg()]: isActive && !isOutlineStyle,
      "border border-transparent": !isActive && isOutlineStyle
    },
    {
      "w-12 flex-col gap-1 rounded-lg":
        isShowLabel && layoutContext === LayoutContext.PORTRAIT,
      "gap-2 rounded-lg p-2 h-9": layoutContext === LayoutContext.DEFAULT,
      "px-2 py-1": !isShowLabel,
      "justify-between": isShowHotKeyHint
    },
    layoutContext === LayoutContext.THIN_WITH_LABEL && {
      "bg-aps3 border-aps2 border-y text-aps1 hover:bg-aps2 hover:bg-opacity-70":
        isActive && !isShowLabel,
      "border border-transparent hover:bg-bgs3 transition-all":
        !isActive && !isShowLabel
    }
  )}
  on:click={onClick}
  use:hoverable={{
    onHover: (isHoveringParam) => {
      isHovering = isHoveringParam;
    }
  }}
  use:popover={resolvePopover()}
>
  <div
    class={cn("flex gap-1", {
      "flex-col items-center":
        layoutContext === LayoutContext.PORTRAIT ||
        layoutContext === LayoutContext.THIN_WITH_LABEL,
      "w-full py-2 rounded-md": layoutContext === LayoutContext.THIN_WITH_LABEL,
      "hover:bg-bgs3 border":
        layoutContext === LayoutContext.THIN_WITH_LABEL && isShowLabel,
      "border-transparent":
        layoutContext === LayoutContext.THIN_WITH_LABEL && !isActive,
      "bg-bgs3 border-brs3":
        layoutContext === LayoutContext.THIN_WITH_LABEL &&
        isActive &&
        isShowLabel
    })}
  >
    {#if item.icon}
      <!-- <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} /> -->
      <div
        class="w-6 flex flex-col gap-1 items-center justify-center"
        bind:this={buttonRef}
      >
        <Icon
          icon={item.icon}
          isFilled={isActive ||
            (!isActive &&
              layoutContext === LayoutContext.THIN_WITH_LABEL &&
              isHovering)}
          size={resolveIconSize(layoutContext)}
          class={cn(
            (layoutContext === LayoutContext.DEFAULT ||
              layoutContext === LayoutContext.MINIMIZED) && {
              "fill-aps1": isActive && isOutlineStyle,
              "fill-abg": isActive && !isOutlineStyle
            },
            (layoutContext === LayoutContext.PORTRAIT ||
              layoutContext === LayoutContext.THIN ||
              layoutContext === LayoutContext.THIN_WITH_LABEL) && {
              "fill-aps1": isActive,
              "fill-fgs2":
                !isActive &&
                (layoutContext === LayoutContext.THIN_WITH_LABEL ||
                  layoutContext === LayoutContext.PORTRAIT) &&
                !isHovering,
              "text-fgs3":
                !isActive &&
                layoutContext === LayoutContext.THIN_WITH_LABEL &&
                isHovering
            }
          )}
        />
        {#if layoutContext === LayoutContext.THIN}
          <div
            class={cn("w-1.5 h-1.5 bg-aps1 rounded-full", {
              "bg-aps1": isActive,
              "bg-transparent": !isActive
            })}
          />
        {/if}
      </div>
    {/if}
    {#if isShowLabel}
      <div
        class={cn({
          "text-b2": layoutContext === LayoutContext.DEFAULT,
          "text-b4 w-18 truncate":
            layoutContext === LayoutContext.THIN_WITH_LABEL,
          "text-b4": layoutContext === LayoutContext.PORTRAIT,
          "text-aps1":
            (layoutContext === LayoutContext.THIN_WITH_LABEL ||
              layoutContext === LayoutContext.PORTRAIT) &&
            isActive,
          "text-fgs2":
            layoutContext === LayoutContext.THIN_WITH_LABEL &&
            !isActive &&
            !isHovering,
          "text-fgs1":
            layoutContext === LayoutContext.THIN_WITH_LABEL &&
            isHovering &&
            !isActive
        })}
      >
        {item.label}
      </div>
    {/if}
  </div>
  {#if isShowHotKeyHint && layoutContext === LayoutContext.DEFAULT}
    {@const hotKey = resolveHotKey()}
    {#if hotKey}
      <span
        class={cn(
          "flex justify-center items-center w-5 h-5 text-b4 rounded-md",
          {
            "bg-aps2 text-fgs1": isActive,
            "bg-bgs3": !isActive
          }
        )}
      >
        {hotKey.toUpperCase()}
      </span>
    {/if}
  {/if}
</button>
