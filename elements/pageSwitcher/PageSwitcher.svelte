<script lang="ts">
  import {
    PageSwitcherStyle,
    type PageMenuItem,
  } from "$lib/tidy/types/pagemenuitem.type";
  import { onMount } from "svelte";
  import PageSwitcherItem from "./PageSwitcherItem.svelte";
  import {
    generateBackgroudColor,
    getComponentFromPath,
  } from "$lib/tidy/utils/utils";
  import { goto } from "$app/navigation";
  import type { ComponentType } from "$lib/tidy/types/component.type";
  import { appMenu } from "$lib/local/stores/local.store";
  export let style: PageSwitcherStyle = PageSwitcherStyle.DEFAULT;
  export let parentBackgroundIndex: number;
  export let isHovered: boolean = false;
  let items: ComponentType[] = [];
  let backgroundColor: string;
  let selected: number;
  onMount(() => {
    appMenu.forEach((page) => {
      const currentPage = getComponentFromPath(page);
      if (currentPage) {
        items.push(currentPage);
      }
    });
    let currentPath = window.location.pathname.replace("/", "");
    let currentPage = items.find((item) => currentPath.includes(item.path));
    selected = currentPage ? items.indexOf(currentPage) : 0;
    let colors = generateBackgroudColor(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
  });
</script>

<div
  class="flex justify-center {style === PageSwitcherStyle.THIN
    ? ''
    : 'flex-col rounded-lg'} min-w-min w-full"
>
  {#each items as item, index}
    {#if style != PageSwitcherStyle.MINIMIZED || (style === PageSwitcherStyle.MINIMIZED && (isHovered || selected == index))}
      <PageSwitcherItem
        {parentBackgroundIndex}
        {style}
        isShowLabel={(style === PageSwitcherStyle.MINIMIZED && isHovered) ||
          style != PageSwitcherStyle.MINIMIZED}
        on:click={() => {
          selected = index;
          goto("/" + item.path);
        }}
        {item}
      />
    {/if}
  {/each}
</div>
