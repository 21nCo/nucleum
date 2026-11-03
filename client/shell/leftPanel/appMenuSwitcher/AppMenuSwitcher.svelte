<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { LayoutContext } from "@nucleum/shell/layout-mode.type";
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";
  import AppMenuSwitcherItem from "@nucleum/shell/leftPanel/appMenuSwitcher/AppMenuSwitcherItem.svelte";
  import { ActionType } from "@nucleum/client/config/action.type";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { appStore, isInEditMode } from "@nucleum/shared-state/app-context/app.store";
  import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { appEvents } from "@nucleum/shared-state/events/app-events.store";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import view from "@21n/ui/environment/view.store";
  import { cn } from "@21n/ui/environment/presentation";
  import AppMenuSwitcherItemGroup from "@nucleum/shell/leftPanel/appMenuSwitcher/AppMenuSwitcherItemGroup.svelte";
  import AppMenuPinnedSpaces from "@nucleum/shell/leftPanel/appMenuSwitcher/AppMenuPinnedSpaces.svelte";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  let {
    layoutContext = LayoutContext.DEFAULT,
    parentBackgroundIndex,
    isHovered = false,
    capture = undefined
  }: {
    layoutContext?: LayoutContext;
    parentBackgroundIndex: number;
    isHovered?: boolean;
    /** Quick capture slot injected between portrait menu items. */
    capture?: Snippet;
  } = $props();
  let allPages = $state<IAction[]>([]);
  let defaultPages = $state<IAction[]>([]);
  let current = $state("");
  const productConfig = requireProductConfig();

  refresh();
  onMount(() => {
    const unsubscribe = appMenuStore.subscribe(() => {
      refresh();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  function refresh() {
    allPages = [];
    let items = [];
    let defaultMenu = productConfig.appMenu;
    if ($view.isConstrainedWidth || $view.isPortrait) {
      defaultMenu = productConfig.appMenuPt;
    }
    if (layoutContext === LayoutContext.PORTRAIT) {
      items = defaultMenu.slice(
        0,
        productConfig.isShowCaptureOnMobile ? 3 : 4
      );
      items.push("cp");
    } else {
      items = defaultMenu.filter((item) => item !== "cp");
    }
    items.forEach((action: string) => {
      const currentPage = requireCommandHost().resolveAction(action);
      if (currentPage) {
        allPages.push(currentPage);
      }
    });
    defaultPages = allPages.filter((x) => defaultMenu.includes(x.action));
    if (layoutContext != LayoutContext.PORTRAIT) {
    }
    let currentPath = window?.location?.pathname?.replace("/", "");
    let currentPage = allPages.find((item) =>
      currentPath.includes(item.path ?? item.action)
    );
    current = currentPage ? currentPage.action : "";
  }

  function onClick(item: IAction) {
    if (layoutContext == LayoutContext.PORTRAIT) {
      toasts.reset();
    }
    isInEditMode.set(false);
    const currentPath = window.location.pathname.replace("/", "");
    const resolvedCurrent =
      allPages.find((pageItem) =>
        currentPath.includes(pageItem.path ?? pageItem.action)
      )?.action ?? "";
    const searchParams = new URL(window.location.href).searchParams;
    const isActivePage =
      resolvedCurrent === item.action && item.type === ActionType.PAGE;
    const isActivePageWithRightPanel =
      isActivePage && Boolean(searchParams.get(AccessMode.PANEL));
    const isActivePageCovered =
      isActivePage &&
      [
        AccessMode.PAGE,
        AccessMode.BESIDE_PAGE,
        AccessMode.BESIDE_BASE,
        AccessMode.OVERLAY
      ].some((mode) => searchParams.get(mode));
    if (isActivePageCovered && !isActivePageWithRightPanel) {
      navigation.closeResource();
    } else if (!isActivePage || isActivePageWithRightPanel) {
      requireCommandHost().runAction(item.action);
    }
    current = item.action;
    appEvents.publish(GlobalEvent.APP_MENU_SWITCHED, item.action);
  }

  function onClickFromGroup(e: CustomEvent<IAction>) {
    onClick(e.detail);
  }
</script>

{#if layoutContext === LayoutContext.PORTRAIT}
  <div
    id="app-menu"
    class={cn("flex justify-around items-center min-w-min w-full", {
      "px-2": allPages.length < 4
    })}
  >
    {#each allPages as item, index (item.action)}
      {#if index == Math.floor(allPages.length / 2) && productConfig.isShowCaptureOnMobile}
        {@render capture?.()}
      {/if}
      <AppMenuSwitcherItem
        {parentBackgroundIndex}
        {layoutContext}
        onClick={() => onClick(item)}
        {item}
      />
    {/each}
  </div>
{:else}
  <div
    id="app-menu"
    class={cn("flex flex-col justify-center rounded-lg min-w-min w-full", {
      "gap-3": layoutContext === LayoutContext.THIN_WITH_LABEL,
      "gap-1": layoutContext !== LayoutContext.THIN_WITH_LABEL
    })}
  >
    <AppMenuSwitcherItemGroup
      {parentBackgroundIndex}
      {layoutContext}
      items={defaultPages}
      {onClick}
    />
    <AppMenuPinnedSpaces {layoutContext} />
  </div>
{/if}
