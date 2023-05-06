<script lang="ts">
  import {
    PageSwitcherStyle,
    type PageMenuItem,
  } from "$lib/tidy/types/pagemenuitem.type";
  import { createEventDispatcher } from "svelte";
  import Element from "../Element.svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import Icon from "$lib/tidy/icons/Icon.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";
  const dispatch = createEventDispatcher();
  export let item: PageMenuItem;
  export let style: PageSwitcherStyle = PageSwitcherStyle.DEFAULT;
  export let isActive: boolean = false;
  export let isShowLabel: boolean = true;
  export let parentBackgroundIndex: number;
  let pad: number;
  let rive: any;
  $: if ($windowObject.documentHeight) {
    let rawPad = ($windowObject.documentWidth / 10) * $windowObject.scale;
    pad = rawPad > 30 ? 30 : rawPad;
  }
  function onClick() {
    rive?.fire();
    dispatch("click", {});
  }
  function onHover() {
    rive?.fire();
  }
</script>

<Element
  classList="flex gap-2 text-b2 items-center {isShowLabel
    ? style === PageSwitcherStyle.THIN
      ? 'rounded-full'
      : 'rounded-lg px-6 h-12'
    : 'p-4 rounded-full'}"
  {isActive}
  on:click={onClick}
  on:pointerenter={onHover}
  {parentBackgroundIndex}
  selectionStyle={style === PageSwitcherStyle.THIN
    ? SelectionItemActiveStyle.ACCENT_COLOR
    : SelectionItemActiveStyle.ACCENT_BACKGROUND}
  styleList="padding-top: {pad / 2}px;padding-bottom: {pad /
    2}px;padding-left: {pad}px;padding-right: {pad}px;"
>
  {#if item.icon}
    <!-- <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} /> -->
    <Icon
      icon={item.icon}
      {isActive}
      selectionStyle={style === PageSwitcherStyle.THIN
        ? SelectionItemActiveStyle.ACCENT_COLOR
        : SelectionItemActiveStyle.NONE}
    />
  {/if}
  {#if isShowLabel}
    {item.label}
  {/if}
</Element>
