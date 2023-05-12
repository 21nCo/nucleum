<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import {
    SelectionItemActiveStyle,
    SwitcherStyle,
  } from "$lib/tidy/types/switcher.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import SwitchItem from "./SwitchItem.svelte";

  const dispatch = createEventDispatcher();
  export let items: string[];
  export let selectedIndex: number;
  export let size: Size = Size.md;
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.UNKNOWN;
  export let parentBackgroundIndex: number = 1;
  export let style: SwitcherStyle = SwitcherStyle.HorizontalAndWraps;
  export let title: string | undefined = undefined;
  let classList: string;
  function handleClick(event: any) {
    let selectedMenuItem = event.detail.item;
    selectedIndex = items.indexOf(selectedMenuItem!);
    dispatch("switch", { selected: selectedIndex });
  }
  onMount(() => {
    switch (style) {
      case SwitcherStyle.Vertical:
        classList = "flex justify-start items-stretch flex-col gap-2";
        selectionStyle =
          selectionStyle === SelectionItemActiveStyle.UNKNOWN
            ? SelectionItemActiveStyle.CIRCLE
            : selectionStyle;
        break;
      case SwitcherStyle.Horizontal:
        classList = "flex w-full pb-2 gap-2";
        selectionStyle =
          selectionStyle === SelectionItemActiveStyle.UNKNOWN
            ? SelectionItemActiveStyle.SIDEBAR
            : selectionStyle;
        break;
      case SwitcherStyle.HorizontalAndWraps:
        classList = "flex gap-2 flex-wrap w-full pb-2";
        selectionStyle =
          selectionStyle === SelectionItemActiveStyle.UNKNOWN
            ? SelectionItemActiveStyle.SIDEBAR
            : selectionStyle;
        break;
      default:
    }
  });
</script>

<div class="flex flex-col gap-2">
  {#if title}
    <div class="text-fgs2">{title}</div>
  {/if}
  <div class={classList}>
    {#each items as item, index}
      <SwitchItem
        {selectionStyle}
        {parentBackgroundIndex}
        {size}
        {item}
        isActive={selectedIndex === index}
        on:click={handleClick}
      />
    {/each}
  </div>
</div>
