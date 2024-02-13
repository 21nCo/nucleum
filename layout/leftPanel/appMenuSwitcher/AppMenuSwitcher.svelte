<script lang="ts">
  import { LayoutContext } from "$lib/tidy/types/layout.type";
  import { onMount } from "svelte";
  import AppMenuSwitcherItem from "./AppMenuSwitcherItem.svelte";
  import {
    resolveNavigationAction,
    resolveComponent
  } from "$lib/tidy/utils/utils";
  import type { Action } from "$lib/tidy/types/action.type";
  import { userLocalPreferences } from "$lib/local/stores/local.store";
  import type { UserLocalPreferences } from "$lib/local/types/userLocalPreferences.type";
  import { resolveBackgroundClass } from "$lib/tidy/utils/theme.utils";
  import CaptureComponent from "$lib/tidy/components/CaptureComponent.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  export let layoutContext: LayoutContext = LayoutContext.DEFAULT;
  export let parentBackgroundIndex: number;
  export let isHovered: boolean = false;
  let pages: Action[] = [];
  let backgroundColor: string;
  let selected: number;
  $: console.log({ pages });
  onMount(() => {
    userLocalPreferences.subscribe((x: UserLocalPreferences) => {
      pages = [];
      let items = [];
      if (!x.appMenu) return;
      if (layoutContext === LayoutContext.PORTRAIT) {
        items = x.appMenu.slice(
          0,
          $appStore.appData.isShowCaptureOnMobile ? 3 : 4
        );
        items.push("cp");
      } else {
        items = x.appMenu.filter((item) => item !== "cp");
      }
      console.log("app menu items", { items });
      items.forEach((action: string) => {
        const currentPage = resolveComponent(action);
        if (currentPage) {
          pages.push(currentPage);
        }
      });
      console.log("app menu pages", { pages });

      let currentPath = window?.location?.pathname?.replace("/", "");
      let currentPage = pages.find((item) =>
        currentPath.includes(item.path ?? item.action)
      );
      selected = currentPage ? pages.indexOf(currentPage) : 0;
    });

    let colors = resolveBackgroundClass(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
  });
</script>

<div
  class="flex {layoutContext === LayoutContext.PORTRAIT
    ? 'justify-around items-center px-2'
    : 'flex-col justify-center rounded-lg'} min-w-min w-full"
>
  {#each pages as item, index}
    {#if index == Math.floor(pages.length / 2) && layoutContext === LayoutContext.PORTRAIT && $appStore.appData.isShowCaptureOnMobile}
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
          resolveNavigationAction(item.action);
        }}
        {item}
      />
    {/if}
  {/each}
</div>
