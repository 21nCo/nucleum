<script lang="ts">
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { onMount } from "svelte";
  import AppMenuSwitcherItem from "./AppMenuSwitcherItem.svelte";
  import { ActionType, type IAction } from "$lib/client/types/action.type";
  import CaptureComponent from "$lib/client/components/CaptureComponent.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import { appMenuStore } from "../../../stores/appMenu/appMenu.store";
  import type { IAppMenuStore } from "$lib/client/stores/appMenu/appMenu.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { appEvents, toasts } from "$lib/client/stores/notification.store";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import view from "$lib/client/stores/view.store";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
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
</script>

{#if layoutContext == LayoutContext.PORTRAIT}
  <div class="flex justify-around items-center px-2 min-w-min w-full">
    {#each allPages as item, index (item.action)}
      {#if index == Math.floor(allPages.length / 2) && $appStore.appData?.isShowCaptureOnMobile}
        <CaptureComponent />
      {/if}
      <AppMenuSwitcherItem
        {parentBackgroundIndex}
        {layoutContext}
        isShowLabel={true}
        on:click={() => onClick(item)}
        {item}
      />
    {/each}
  </div>
{:else}
  <div class="flex flex-col gap-1 justify-center rounded-lg min-w-min w-full">
    <div class="flex flex-col gap-1">
      {#each defaultPages as item (item.action)}
        <AppMenuSwitcherItem
          {parentBackgroundIndex}
          {layoutContext}
          isShowLabel={layoutContext == LayoutContext.DEFAULT}
          on:click={() => onClick(item)}
          {item}
        />
      {/each}
    </div>
    {#if userPinnedPages.length > 0}
      <div class="flex flex-col gap-1">
        <Divider colorStrength={ColorStrength.Strong} />
        <!-- {#if layoutContext === LayoutContext.DEFAULT}
          <div class="px-1">
            <Text content="Pinned" style={TextStyle.SECTION_HEADING_SMALL} />
          </div>
        {/if} -->
        <div class="flex flex-col gap-1">
          {#each userPinnedPages as item (item.action)}
            <AppMenuSwitcherItem
              {parentBackgroundIndex}
              {layoutContext}
              isShowLabel={layoutContext == LayoutContext.DEFAULT}
              on:click={() => onClick(item)}
              {item}
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
