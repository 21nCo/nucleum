<script lang="ts">
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { onMount } from "svelte";
  import AppMenuSwitcherItem from "./AppMenuSwitcherItem.svelte";
  import { ActionType, type IAction } from "$lib/client/types/action.type";
  import CaptureComponent from "$lib/client/components/CaptureComponent.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import { appMenuStore } from "../../../stores/appMenu/appMenu.store";
  import type { IAppMenuStore } from "$lib/client/stores/appMenu/appMenu.type";
  import { appEvents, toasts } from "$lib/client/stores/notification.store";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import view from "$lib/client/stores/view.store";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import AppMenuSwitcherItemGroup from "./AppMenuSwitcherItemGroup.svelte";

  export let layoutContext: LayoutContext = LayoutContext.DEFAULT;
  export let parentBackgroundIndex: number;
  export let isHovered: boolean = false;
  let allPages: IAction[] = [];
  let defaultPages: IAction[] = [];
  let userPinnedPages: IAction[] = [];
  let current: string;

  refresh(appMenuStore.get());
  onMount(() => {
    const unsubscribe = appMenuStore.subscribe((x: IAppMenuStore) => {
      refresh(x);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  function refresh(x: IAppMenuStore) {
    allPages = [];
    let items = [];
    const app = $appStore.product;
    let defaultMenu = x[app]?.default ?? [];
    if ($view.isConstrainedWidth || $context.os === OperatingSystem.IOS) {
      defaultMenu = x[app]?.mobile ?? [];
    }
    let userPinnedMenu: string[] = [];
    if (!$view.isConstrainedWidth) userPinnedMenu = x[app]?.user ?? [];
    const contextualMenu = [...defaultMenu, ...userPinnedMenu];
    // console.log({ contextualMenu });
    if (layoutContext === LayoutContext.PORTRAIT) {
      items = contextualMenu.slice(
        0,
        $appStore?.appData?.isShowCaptureOnMobile ? 3 : 4
      );
      items.push("cp");
    } else {
      items = contextualMenu.filter((item) => item !== "cp");
    }
    items.forEach((action: string) => {
      const currentPage = appStore.resolveAction(action);
      if (currentPage) {
        allPages.push(currentPage);
      }
    });
    defaultPages = allPages.filter((x) => defaultMenu.includes(x.action));
    userPinnedPages = allPages.filter((x) => userPinnedMenu.includes(x.action));
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
    // console.log({ item, selected: current });
    if (
      current !== item.action ||
      window.location.pathname.includes("/tab") ||
      item.type !== ActionType.PAGE
    ) {
      appStore.runAction(item.action);
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
    class={cn("flex justify-around items-center min-w-min w-full", {
      "px-2": allPages.length < 4
    })}
  >
    {#each allPages as item, index (item.action)}
      {#if index == Math.floor(allPages.length / 2) && $appStore.appData?.isShowCaptureOnMobile}
        <CaptureComponent />
      {/if}
      <AppMenuSwitcherItem
        {parentBackgroundIndex}
        {layoutContext}
        on:click={() => onClick(item)}
        {item}
      />
    {/each}
  </div>
{:else}
  <div
    class={cn("flex flex-col justify-center rounded-lg min-w-min w-full", {
      "gap-3": layoutContext === LayoutContext.THIN_WITH_LABEL,
      "gap-1": layoutContext !== LayoutContext.THIN_WITH_LABEL
    })}
  >
    <AppMenuSwitcherItemGroup
      {parentBackgroundIndex}
      {layoutContext}
      items={defaultPages}
      on:click={onClickFromGroup}
    />
    {#if userPinnedPages.length > 0}
      <div
        class={cn("flex flex-col", {
          "gap-3": layoutContext === LayoutContext.THIN_WITH_LABEL,
          "gap-1": layoutContext !== LayoutContext.THIN_WITH_LABEL
        })}
      >
        <Divider colorStrength={ColorStrength.Strong} />
        <AppMenuSwitcherItemGroup
          {parentBackgroundIndex}
          {layoutContext}
          items={userPinnedPages}
          on:click={onClickFromGroup}
        />
      </div>
    {/if}
  </div>
{/if}
