<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { page } from "$app/stores";
  import { LayoutContext } from "@nucleum/shell/layout-mode.type";
  import { onMount } from "svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import view from "@21n/ui/environment/view.store";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { postMessageToParent } from "@nucleum/client/runtime/embed/embed.utils";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { abg, cn } from "@21n/ui/environment/presentation";
  import { EmbedMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { shortcutHints } from "@nucleum/shared-state/shortcuts/shortcut-hints.store";
  import {
    UIState,
    UIStateScope
  } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
  import { popover } from "@21n/ui/actions/popover.action";
  import { hoverable } from "@21n/ui/actions/hover.action";
  import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  import { resourceAction } from "@nucleum/datafn/resource.utils";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
  import { isHideCreateAction } from "@nucleum/shared-state/resources/library.utils";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import ButtonTooltip from "@21n/ui/elements/button/ButtonTooltip.svelte";
  let {
    item,
    layoutContext = LayoutContext.DEFAULT,
    parentBackgroundIndex,
    onClick
  }: {
    item: IAction;
    layoutContext?: LayoutContext;
    parentBackgroundIndex: number;
    onClick?: () => void;
  } = $props();
  const dev_mixedPanel = false;
  let hideMenuLabels = $state(false);
  let isShowHotKeyHint = $derived(
    $shortcutHints?.isShowHotKeyHints &&
      (layoutContext === LayoutContext.DEFAULT || hideMenuLabels)
  );
  let itemPath = $derived(item?.path ?? item?.action);
  let currentRouteParam = $state<string | undefined>(undefined);
  let currentRouteId = $state<string | undefined>(undefined);
  let isActive = $derived(
    Boolean(
      itemPath &&
      (currentRouteParam?.includes(itemPath) ||
        currentRouteId?.includes(itemPath))
    )
  );

  onMount(() => {
    refreshHideMenuLabels();
    const unsubscribe = uiState.subscribe(() => {
      refreshHideMenuLabels();
    });
    const pageUnsubscribe = page.subscribe((p) => {
      currentRouteParam = p?.params?.route;
      currentRouteId = p?.route?.id ?? undefined;
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (pageUnsubscribe) pageUnsubscribe();
    };
  });

  function refreshHideMenuLabels() {
    hideMenuLabels =
      uiState.getState(UIState.hideLeftNavMenuLabels, {
        scope: UIStateScope.DAP
      }) || false;
  }

  let isShowLabel = $derived(
    layoutContext === LayoutContext.DEFAULT ||
      (layoutContext === LayoutContext.THIN_WITH_LABEL && !hideMenuLabels)
  );
  let buttonRef = $state<HTMLElement>();
  let popRef: HTMLButtonElement;
  let pad: number;
  let rive: any;
  let isOutlineStyle: boolean = false;
  let isHovering = $state(false);
  $effect(() => {
    if ($view.height) {
      let rawPad = ($view.width / 10) * $view.scale;
      pad = rawPad > 30 ? 30 : rawPad;
    }
  });

  function handleClick(event: MouseEvent) {
    postMessageToParent(EmbedMessage.MENU_ITEM_SELECTED);
    rive?.fire();
    onClick?.();
  }

  function onHover() {
    rive?.fire();
  }

  function resolveHotKey() {
    const shortcut = keyboardShortcuts.resolveShortcutForAction(item.action);
    if (!shortcut?.key) return;
    return shortcut.prefix
      ? `${shortcut.prefix} ${shortcut.key}`
      : shortcut.key;
  }

  function resolveIconSize(layoutContext: LayoutContext) {
    if (layoutContext === LayoutContext.THIN_WITH_LABEL) {
      return Size.lg;
    }
    if (layoutContext === LayoutContext.THIN) {
      return Size.md;
    }
    return Size.sm;
  }

  function resolveContextMenu() {
    const resource = item?.componentParams?.resource ?? Resource.unknown;
    const createAction = {
      label: "Create new",
      value: "create",
      icon: "plus",
      callback: async () => {
        requireCommandHost().runAction(
          resourceAction(resource, ResourceActionType.CREATE)
        );
        popRef.dispatchEvent(new CustomEvent("hide"));
      }
    };
    if (isHideCreateAction(resource)) return [];
    return [
      {
        group: "all",
        items: [createAction]
      }
    ];
  }

  function resolvePopover() {
    const resource = item?.componentParams?.resource;
    if (!resource || isHideCreateAction(resource)) {
      return {
        content: "",
        triggerMethod: []
      };
    }
    return {
      placement: Placement.BottomCenter,
      content: ContextMenu,
      triggerMethod: [PopoverTriggerMethod.RIGHT_CLICK],
      componentProps: { menuResolver: resolveContextMenu },
      id: "resourceSwitcherContextMenu",
      groupId: "resourceSwitcherContextMenuGroup"
    };
  }

  function resolveTooltipPopover(layoutContext: LayoutContext) {
    const shortcutDetail = keyboardShortcuts.resolveShortcutForAction(
      item.action
    );
    const tooltipText =
      layoutContext === LayoutContext.THIN ||
      layoutContext === LayoutContext.THIN_WITH_LABEL
        ? item.label
        : undefined;
    return {
      placement: Placement.Right,
      content: tooltipText ? ButtonTooltip : "",
      triggerMethod: tooltipText ? [PopoverTriggerMethod.HOVER] : [],
      offsetInPx: 8,
      delay: 400,
      id: `appmenu-tooltip-${item.action ?? "default"}`,
      componentProps: tooltipText
        ? {
            tooltip: tooltipText,
            shortcut: shortcutDetail,
            parentBgIndex: parentBackgroundIndex,
            size: Size.sm
          }
        : {}
    };
  }
</script>

<div class="w-full" use:popover={resolveTooltipPopover(layoutContext)}>
  <button
    bind:this={popRef}
    class={cn(
      "appmenuitem flex items-center cursor-pointer w-full",
      (layoutContext === LayoutContext.DEFAULT ||
        layoutContext === LayoutContext.MINIMIZED) && {
        "bg-aps3 border-aps2 border text-aps1 hover:bg-aps2 hover:bg-opacity-70":
          isActive && isOutlineStyle,
        "hover:bg-bgs3-striped hover:border-brs3": !isActive,
        [abg()]: isActive && !isOutlineStyle,
        "border border-transparent": !isActive && isOutlineStyle
      },
      {
        "gap-2 rounded-lg p-2 h-9": layoutContext === LayoutContext.DEFAULT,
        "px-2 py-1": !isShowLabel,
        "justify-between": isShowHotKeyHint
      },
      layoutContext === LayoutContext.THIN_WITH_LABEL && {
        "bg-aps3 border-y text-aps1 hover:bg-aps2 hover:bg-opacity-70":
          isActive && !isShowLabel,
        "border-y border-transparent hover:bg-bgs3-striped hover:border-brs3 transition-all":
          !isActive && !isShowLabel,
        "border-aps2":
          isActive && (!dev_mixedPanel || !$appStore.currentComponent?.panel),
        "border-transparent":
          isActive && dev_mixedPanel && $appStore.currentComponent?.panel,
        "rounded-r-md": dev_mixedPanel && $appStore.currentComponent?.panel,
        "group/appmenu app-framed:!bg-transparent app-framed:!bg-none app-framed:!border-transparent app-framed:justify-center": true
      }
    )}
    onclick={(event) => {
      event.stopPropagation();
      handleClick(event);
    }}
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
          layoutContext === LayoutContext.THIN_WITH_LABEL,
        "w-full py-2 rounded-md":
          layoutContext === LayoutContext.THIN_WITH_LABEL,
        border: layoutContext === LayoutContext.THIN_WITH_LABEL && isShowLabel,
        "hover:bg-bgs3-striped hover:border-brs3":
          layoutContext === LayoutContext.THIN_WITH_LABEL &&
          isShowLabel &&
          !isActive,
        "border-transparent":
          layoutContext === LayoutContext.THIN_WITH_LABEL && !isActive,
        "bg-bgs3 border-brs3":
          layoutContext === LayoutContext.THIN_WITH_LABEL &&
          isActive &&
          isShowLabel,
        "app-framed:!bg-transparent app-framed:!bg-none app-framed:!border-transparent app-framed:py-1":
          layoutContext === LayoutContext.THIN_WITH_LABEL
      })}
    >
      {#if item.icon}
        <!-- <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} /> -->
        <div
          class={cn("w-6 flex flex-col gap-1 items-center justify-center", {
            "app-framed:w-12 app-framed:h-12 app-framed:rounded-[var(--app-control-radius)] app-framed:transition-colors":
              layoutContext === LayoutContext.THIN_WITH_LABEL,
            "app-framed:bg-aps3":
              layoutContext === LayoutContext.THIN_WITH_LABEL && isActive,
            "app-framed:group-hover/appmenu:bg-bgs3":
              layoutContext === LayoutContext.THIN_WITH_LABEL && !isActive
          })}
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
              (layoutContext === LayoutContext.THIN ||
                layoutContext === LayoutContext.THIN_WITH_LABEL) && {
                "fill-aps1 app-framed:fill-[rgb(var(--colors-onaps3,var(--colors-aps1)))] app-framed:text-[rgb(var(--colors-onaps3,var(--colors-aps1)))]":
                  isActive,
                "!fill-[rgb(var(--colors-onaps3,var(--colors-aps1)))] !text-[rgb(var(--colors-onaps3,var(--colors-aps1)))]": isActive && !isShowLabel,
                "fill-fgs2":
                  !isActive &&
                  layoutContext === LayoutContext.THIN_WITH_LABEL &&
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
            "text-aps1":
              layoutContext === LayoutContext.THIN_WITH_LABEL && isActive,
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
            "flex justify-center items-center min-w-5 h-5 px-1 text-b4 rounded-md whitespace-nowrap",
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
</div>
