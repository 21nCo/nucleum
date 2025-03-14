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
  import { fly } from "svelte/transition";
  import { moveItemInArray } from "$lib/shared/utils/obj.utils";
  import view from "$lib/client/stores/view.store";
  import DropDown from "../dropdown/DropDown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
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
  export let isShowNumberShortcut: boolean = false;
  export let addText: string | undefined = undefined;
  export let isRenderDropdownForCW: boolean = false;
  /**
   * Bar style rendered over a bg shade to give TRAIN style but with bars
   */
  export let isBgBar: boolean = false;
  let _items: ISelectItem[];
  $: _items = items.every((x) => typeof x === "string")
    ? items.map((x) => ({ label: x, value: x }))
    : items;
  $: isRenderAsDropdown = $view.isConstrainedWidth && isRenderDropdownForCW;
  onMount(() => {
    if (value === undefined) value = _items[0]?.value;
  });

  let parent: any;
  let child: any;
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
    class={cn("relative panel-switcher flex items-center shrink-0", {
      "overflow-x-auto":
        !isRenderAsDropdown && style !== PanelSwitcherStyle.SNAKE,
      "w-full justify-between px-2":
        (style === PanelSwitcherStyle.BAR ||
          style === PanelSwitcherStyle.SNAKE) &&
        isExpandToFullWidth,
      "border-b border-brs3":
        ((style === PanelSwitcherStyle.BAR &&
          barStyle != BarStyle.UNDER &&
          barStyle != BarStyle.DOT) ||
          style === PanelSwitcherStyle.SNAKE) &&
        isExpandToFullWidth &&
        !isBgBar,
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
        <span class="mo:mr-3 mr-6" transition:conditionalTransition>
          <slot name="left">
            <Text content={title} style={TextStyle.PANEL_HEADING_SMALL} />
          </slot>
        </span>
      {/if}
      {#if isRenderAsDropdown}
        <div class="flex pl-2">
          <DropDown
            items={_items}
            style={InputStyle.PLAIN}
            width="min-w-32"
            isDisableSearch={true}
            isEnforceWidth={true}
            on:select={(e) => {
              value = e.detail;
              dispatch("switch", e.detail);
            }}
          />
        </div>
      {:else}
        {#each _items as item, index (item.value)}
          <PanelSwitcherItem
            {item}
            {size}
            {style}
            isInEditMode={_items.length > 1 && isInEditMode}
            {barStyle}
            {isInversePlacement}
            {parentBgIndex}
            {isShowNumberShortcut}
            {index}
            bind:triggerItemEdit
            isActive={value === item.value}
            isDisabled={isDisableEnabled && value !== item.value}
            on:click={() => {
              value = item.value;
              dispatch("switch", item.value);
            }}
            on:rearrange={(e) => {
              _items = moveItemInArray(_items, index, e.detail > 0 ? 1 : -1);
            }}
            on:rearranged={(e) => {
              dispatch(
                "rearrange",
                _items.map((x) => x.value)
              );
            }}
            on:change
            on:debouncedChange
            on:remove
          />
        {/each}
      {/if}

      {#if isInEditMode && !$view.isConstrainedWidth}
        <PanelSwitcherItem
          item={{ label: addText ?? "Add", value: "$add" }}
          {size}
          {style}
          isInEditMode={true}
          {barStyle}
          {isInversePlacement}
          {parentBgIndex}
          {isShowNumberShortcut}
          index={_items.length}
          bind:triggerItemEdit
          on:add
        />
      {/if}
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
