<script lang="ts">
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { onMount } from "svelte";
  import AppMenuSwitcherItem from "./AppMenuSwitcherItem.svelte";
  import type { IAction } from "$lib/client/types/action.type";
  import CaptureComponent from "$lib/client/components/CaptureComponent.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { appMenuStore } from "../../../stores/appMenu/appMenu.store";
  import type { IAppMenuStore } from "$lib/client/stores/appMenu/appMenu.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  export let layoutContext: LayoutContext = LayoutContext.DEFAULT;
  export let parentBackgroundIndex: number;
  export let isHovered: boolean = false;
  let allPages: IAction[] = [];
  let defaultPages: IAction[] = [];
  let userPinnedPages: IAction[] = [];
  let selected: number;
  refresh(appMenuStore.get());
  onMount(() => {
    appMenuStore.subscribe((x: IAppMenuStore) => {
      refresh(x);
    });
  });

  function refresh(x: IAppMenuStore) {
    allPages = [];
    let items = [];
    const app = $appStore.product;
    const defaultMenu = x[app]?.default ?? [];
    const userPinnedMenu = x[app]?.user ?? [];
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
    selected = currentPage ? allPages.indexOf(currentPage) : 0;
  }

  function onClick(index: number, item: IAction) {
    if (layoutContext == LayoutContext.PORTRAIT) {
      toasts.reset();
    }
    selected = index;
    appStore.runAction(item.action);
  }
</script>

{#if layoutContext == LayoutContext.PORTRAIT}
  <div class="flex justify-around items-center px-2 min-w-min w-full">
    {#each allPages as item, index}
      {#if index == Math.floor(allPages.length / 2) && $appStore.appData?.isShowCaptureOnMobile}
        <CaptureComponent />
      {/if}
      <AppMenuSwitcherItem
        {parentBackgroundIndex}
        {layoutContext}
        isShowLabel={true}
        on:click={() => onClick(index, item)}
        {item}
      />
    {/each}
  </div>
{:else}
  <div class="flex flex-col gap-3 justify-center rounded-lg min-w-min w-full">
    <div class="flex flex-col">
      {#each defaultPages as item, index}
        <AppMenuSwitcherItem
          {parentBackgroundIndex}
          {layoutContext}
          isShowLabel={layoutContext == LayoutContext.DEFAULT}
          on:click={() => onClick(index, item)}
          {item}
        />
      {/each}
    </div>
    {#if userPinnedPages.length > 0}
      <div class="flex flex-col gap-1.5">
        <Divider colorStrength={ColorStrength.Strong} />
        {#if layoutContext === LayoutContext.DEFAULT}
          <div class="px-1">
            <Text content="Pinned" style={TextStyle.SECTION_HEADING} />
          </div>
        {/if}
        <div class="flex flex-col">
          {#each userPinnedPages as item, index}
            <AppMenuSwitcherItem
              {parentBackgroundIndex}
              {layoutContext}
              isShowLabel={layoutContext == LayoutContext.DEFAULT}
              on:click={() => onClick(index, item)}
              {item}
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
