<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { LayoutContext } from "@nucleum/shell/layout-mode.type";
  import { onMount } from "svelte";
  import { ActionType } from "@nucleum/client/config/action.type";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import {
    appStore,
    isInEditMode
  } from "@nucleum/shared-state/app-context/app.store";
  import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
  import { appEvents } from "@nucleum/shared-state/events/app-events.store";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import view from "@21n/ui/environment/view.store";
  import { cn } from "@21n/ui/environment/presentation";
  import AppMenuSwitcherItemGroup from "@nucleum/shell/leftPanel/appMenuSwitcher/AppMenuSwitcherItemGroup.svelte";
  import AppMenuPinnedSpaces from "@nucleum/shell/leftPanel/appMenuSwitcher/AppMenuPinnedSpaces.svelte";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import {
    hasClosableLayer,
    navigation
  } from "@nucleum/shell/navigation/navigation";
  let {
    layoutContext = LayoutContext.DEFAULT,
    parentBackgroundIndex,
    isHovered = false
  }: {
    layoutContext?: LayoutContext;
    parentBackgroundIndex: number;
    isHovered?: boolean;
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
    const defaultMenu =
      $view.isConstrainedWidth || $view.isPortrait
        ? productConfig.appMenuPt
        : productConfig.appMenu;
    defaultMenu.forEach((action: string) => {
      const currentPage = requireCommandHost().resolveAction(action);
      if (currentPage) {
        allPages.push(currentPage);
      }
    });
    defaultPages = allPages.filter((x) => defaultMenu.includes(x.action));
    let currentPath = window?.location?.pathname?.replace("/", "");
    let currentPage = allPages.find((item) =>
      currentPath.includes(item.path ?? item.action)
    );
    current = currentPage ? currentPage.action : "";
  }

  function onClick(item: IAction) {
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
    const isActivePageCovered = isActivePage && hasClosableLayer(searchParams);
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
