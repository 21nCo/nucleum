<script lang="ts">
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import PanelSwitcherItem from "./PanelSwitcherItem.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn, emptyTranstition } from "$lib/client/utils/ui.utils";
  import type {
    ISelectItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import Text from "../text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { fade, fly, slide } from "svelte/transition";
  const dispatch = createEventDispatcher();
  export let items: ISelectItem[] | string[];
  export let value: ISelectValue | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let parentBgIndex: number = 1;
  export let isInEditMode: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  export let isExpandToFullWidth: boolean = false;
  export let isEnableAnimationForTitle: boolean = false;
  export let title: string = "";
  export let barStyle: BarStyle = BarStyle.EXACT;
  /**
   * Shows the bars or train upside down
   */
  export let isInversePlacement: boolean = false;
  export let triggerItemEdit: string | null = null;
  let _items: ISelectItem[];
  $: _items = items.every((x) => typeof x === "string")
    ? items.map((x) => ({ label: x, value: x }))
    : items;
  onMount(() => {
    if (value === undefined) value = _items[0]?.value;
  });
  $: if (isInEditMode && _items[_items.length - 1]?.value !== "$add") {
    _items.push({ label: "Add", value: "$add" });
    setTimeout(() => {
      // updateParentWidth();
    }, 1000);
    // updateParentWidth();
  } else if (_items[_items.length - 1]?.value === "$add") {
    _items.pop();
    // updateParentWidth();
  }

  let parent: any;
  let child: any;
  // const updateParentWidth = () => {
  //   console.log("updateParentWidth", {
  //     parent,
  //     child,
  //     width: child.offsetWidth
  //   });
  //   if (parent && child) {
  //     parent.style.width = `${child.offsetWidth}px`;
  //   }
  // };
  function conditionalTransition(node: any) {
    if (isEnableAnimationForTitle) {
      return fly(node, { y: -100, duration: 300 });
    }
    return emptyTranstition();
  }
</script>

{#key isInEditMode}
  <div
    bind:this={parent}
    class={cn("relative panel-switcher flex items-center", {
      "w-full justify-between px-2":
        (style === PanelSwitcherStyle.BAR ||
          style === PanelSwitcherStyle.SNAKE) &&
        isExpandToFullWidth,
      "border-b border-brs3":
        ((style === PanelSwitcherStyle.BAR &&
          barStyle != BarStyle.UNDER &&
          barStyle != BarStyle.DOT) ||
          style === PanelSwitcherStyle.SNAKE) &&
        isExpandToFullWidth,
      "inline-block": style !== PanelSwitcherStyle.BAR || !isExpandToFullWidth
    })}
  >
    <div
      bind:this={child}
      class={cn(
        "flex min-w-fit items-center",
        bg(
          style === PanelSwitcherStyle.TRAIN ? parentBgIndex : parentBgIndex - 1
        ),
        {
          "border-b border-brs3":
            ((style === PanelSwitcherStyle.BAR &&
              barStyle != BarStyle.UNDER &&
              barStyle != BarStyle.DOT) ||
              style === PanelSwitcherStyle.SNAKE) &&
            !isExpandToFullWidth &&
            !isInversePlacement,
          "items-center justify-around gap-6": style === PanelSwitcherStyle.DOT,
          "border-brs3": style === PanelSwitcherStyle.TRAIN,
          "rounded-full border-2":
            style === PanelSwitcherStyle.TRAIN &&
            (size === Size.md || size === Size.lg),
          "rounded-md border":
            style === PanelSwitcherStyle.TRAIN &&
            (size === Size.sm || size === Size.xs),
          //TEMP
          "pr--2": style === PanelSwitcherStyle.TRAIN && isInEditMode
        }
      )}
    >
      {#if title || $$slots.left}
        <span class="mr-6" transition:conditionalTransition>
          <slot name="left">
            <Text content={title} style={TextStyle.PANEL_HEADING_SMALL} />
          </slot>
        </span>
      {/if}
      {#each _items as item, index (item.value)}
        <PanelSwitcherItem
          {item}
          {size}
          {style}
          {isInEditMode}
          {barStyle}
          {isInversePlacement}
          {parentBgIndex}
          bind:triggerItemEdit
          isActive={value === item.value}
          isDisabled={isDisableEnabled && value !== item.value}
          on:click={() => {
            value = item.value;
            dispatch("switch", item.value);
          }}
          on:change
          on:add
          on:remove
        />
      {/each}
    </div>
    {#if $$slots.right}
      <span class="ml-6">
        <slot name="right">
          <span>no content</span>
        </slot>
      </span>
    {/if}
  </div>
{/key}
