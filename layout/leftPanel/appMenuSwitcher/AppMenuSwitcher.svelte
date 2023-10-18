<script lang="ts">
  import { LayoutContext } from "$lib/tidy/types/layout.type";
  import { onMount } from "svelte";
  import AppMenuSwitcherItem from "./AppMenuSwitcherItem.svelte";
  import {
    generateBackgroudColor,
    getComponentFromPath,
  } from "$lib/tidy/utils/utils";
  import type { ComponentType } from "$lib/tidy/types/component.type";
  import { windowObject } from "$lib/tidy/stores/app.store";
  import { userLocalPreferences } from "$lib/local/stores/local.store";
  import type { UserLocalPreferences } from "$lib/local/types/userLocalPreferences.type";
  export let layoutContext: LayoutContext = LayoutContext.DEFAULT;
  export let parentBackgroundIndex: number;
  export let isHovered: boolean = false;
  let pages: ComponentType[] = [];
  let backgroundColor: string;
  let selected: number;
  onMount(() => {
    userLocalPreferences.subscribe((x: UserLocalPreferences) => {
      pages = [];
      let items = [];
      if (!x.appMenu) return;
      if (layoutContext === LayoutContext.PORTRAIT) {
        items = x.appMenu.slice(0, 4);
        items.push("cp");
      } else {
        items = x.appMenu.filter((item) => item !== "cp");
      }
      items.forEach((page: string) => {
        const currentPage = getComponentFromPath(page);
        if (currentPage) {
          pages.push(currentPage);
        }
      });
      let currentPath = window.location.pathname.replace("/", "");
      let currentPage = pages.find((item) => currentPath.includes(item.path));
      selected = currentPage ? pages.indexOf(currentPage) : 0;
    });

    let colors = generateBackgroudColor(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
  });
</script>

<div
  class="flex {layoutContext === LayoutContext.PORTRAIT
    ? 'justify-around items-center px-4'
    : 'flex-col justify-center rounded-lg'} min-w-min w-full"
>
  {#each pages as item, index}
    {#if layoutContext != LayoutContext.MINIMIZED || (layoutContext === LayoutContext.MINIMIZED && (isHovered || selected == index))}
      <AppMenuSwitcherItem
        {parentBackgroundIndex}
        {layoutContext}
        isShowLabel={layoutContext == LayoutContext.DEFAULT}
        on:click={() => {
          selected = index;
          windowObject.gotoPath("/" + item.path);
        }}
        {item}
      />
    {/if}
  {/each}
</div>
