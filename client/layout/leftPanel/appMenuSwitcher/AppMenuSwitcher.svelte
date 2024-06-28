<script lang="ts">
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { onMount } from "svelte";
  import AppMenuSwitcherItem from "./AppMenuSwitcherItem.svelte";
  import type { IAction } from "$lib/client/types/action.type";
  import CaptureComponent from "$lib/client/components/CaptureComponent.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { appMenuStore } from "../appMenu.store";
  import type { IAppMenuStore } from "$lib/client/types/appMenu.type";
  export let layoutContext: LayoutContext = LayoutContext.DEFAULT;
  export let parentBackgroundIndex: number;
  export let isHovered: boolean = false;
  let pages: IAction[] = [];
  let selected: number;
  onMount(() => {
    appMenuStore.subscribe((x: IAppMenuStore) => {
      pages = [];
      let items = [];
      console.log("appMenu", x?.menu);
      if (!x?.menu) return;
      const app = $appStore.product;
      const contextualMenu = x.menu[app];
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
          pages.push(currentPage);
        }
      });
      let currentPath = window?.location?.pathname?.replace("/", "");
      let currentPage = pages.find((item) =>
        currentPath.includes(item.path ?? item.action)
      );
      selected = currentPage ? pages.indexOf(currentPage) : 0;
    });
  });
</script>

<div
  class="flex {layoutContext === LayoutContext.PORTRAIT
    ? 'justify-around items-center px-2'
    : 'flex-col justify-center rounded-lg'} min-w-min w-full"
>
  {#each pages as item, index}
    {#if index == Math.floor(pages.length / 2) && layoutContext === LayoutContext.PORTRAIT && $appStore.appData?.isShowCaptureOnMobile}
      <CaptureComponent />
    {/if}
    {#if layoutContext != LayoutContext.MINIMIZED || (layoutContext === LayoutContext.MINIMIZED && (isHovered || selected == index))}
      <AppMenuSwitcherItem
        {parentBackgroundIndex}
        {layoutContext}
        isShowLabel={layoutContext == LayoutContext.DEFAULT ||
          layoutContext == LayoutContext.PORTRAIT ||
          (layoutContext === LayoutContext.MINIMIZED && isHovered)}
        on:click={() => {
          selected = index;
          appStore.runAction(item.action);
        }}
        {item}
      />
    {/if}
  {/each}
</div>
