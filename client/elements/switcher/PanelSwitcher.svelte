<script lang="ts" context="module">
  let panelSwitcherCounter = 0;

  export const resolvePanelSwitcherId = () => {
    panelSwitcherCounter += 1;
    return `panel-switcher-${panelSwitcherCounter}`;
  };
</script>

<script lang="ts">
  import {
    BarStyle,
    PanelSwitcherActiveItemStrength,
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
  import { fly } from "svelte/transition";
  import { moveItemInArray } from "$lib/shared/utils/obj.utils";
  import view from "$lib/client/stores/view.store";
  import DropDown from "../dropdown/DropDown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { isTextElement } from "$lib/client/utils/browser.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Icon from "../Icon.svelte";
  import TrainPanelSwitcher from "./train/TrainPanelSwitcher.svelte";
  import { KeyboardKey } from "$lib/client/types/keyboard.type";
  const dispatch = createEventDispatcher();

  const PANEL_SWITCHER_ATTR = "data-panel-switcher-id";
  export let items: ISelectItem[] | string[];
  export let value: ISelectValue | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let parentBgIndex: number = 1;
  export let isInEditMode: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let style: PanelSwitcherStyle;
  export let isExpandToFullWidth: boolean = false;
  export let isEnableAnimationForTitle: boolean = false;
  export let title: string = "";
  export let barStyle: BarStyle = BarStyle.EXACT;
  export let activeItemStrength: PanelSwitcherActiveItemStrength =
    PanelSwitcherActiveItemStrength.DEFAULT;
  /**
   * Shows the bars or train upside down
   */
  export let isInversePlacement: boolean = false;
  export let triggerItemEdit: string | null = null;
  export let addText: string | undefined = undefined;
  export let isRenderDropdownForCW: boolean = false;
  /**
   * Bar style rendered over a bg shade to give TRAIN style but with bars
   */
  export let isBgBar: boolean = false;
  export let isRearrangeableByDefault: boolean = false;
  export let isEnableTitleAction: boolean = false;
  export let isPreventTabShortcut: boolean = false;
  export let tempTitleWithActionDisabled: boolean = false;

  let _items: ISelectItem[];
  const titleValue = "$title";
  const switcherId = resolvePanelSwitcherId();
  $: _items = items.every((x) => typeof x === "string")
    ? items.map((x) => ({ label: x, value: x }))
    : items;
  $: isRenderAsDropdown = $view.isConstrainedWidth && isRenderDropdownForCW;
  onMount(() => {
    parent?.setAttribute(PANEL_SWITCHER_ATTR, switcherId);
    if (
      value === undefined ||
      items.find((x) =>
        typeof x === "string" ? x === value : x.value === value
      ) === undefined
    )
      value = _items[0]?.value;
  });

  let parent: any;
  let child: any;
  function conditionalTransition(node: any) {
    if (isEnableAnimationForTitle) {
      return fly(node, { y: -100, duration: 300 });
    }
    return emptyTranstition();
  }

  const isTopmostPanelSwitcher = () => {
    if (typeof document === "undefined") return false;
    if (!parent || !parent.isConnected) return false;
    const switchers = Array.from(
      document.querySelectorAll(`[${PANEL_SWITCHER_ATTR}]`)
    ).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    );
    const visibleSwitchers = switchers.filter((element) => {
      if (!element.isConnected) return false;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden")
        return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!visibleSwitchers.length) return false;
    return visibleSwitchers[visibleSwitchers.length - 1] === parent;
  };
</script>

{#if style === PanelSwitcherStyle.TRAIN && !isRenderAsDropdown}
  <TrainPanelSwitcher
    items={_items}
    bind:value
    {size}
    {isDisableEnabled}
    {parentBgIndex}
    {activeItemStrength}
    on:switch
  />
{:else if isRenderAsDropdown}
  <div class="flex">
    <DropDown
      items={_items}
      style={InputStyle.PLAIN}
      width="min-w-32"
      popoverWidth="min-w-fit"
      isDisableSearch={true}
      isEnforceWidth={true}
      on:select={(e) => {
        value = e.detail;
        dispatch("switch", e.detail);
      }}
    />
  </div>
{:else}
  {#key isInEditMode}
    <div
      bind:this={parent}
      class={cn(
        "relative panel-switcher flex items-center shrink-0",
        style === PanelSwitcherStyle.SNAKE && {
          "border-b border-brs3": isExpandToFullWidth && !isBgBar,
          "inline-block": !isExpandToFullWidth
        },
        style === PanelSwitcherStyle.BAR && {
          "overflow-x-auto": !isRenderAsDropdown,
          "h-12": !isExpandToFullWidth,
          "border-b border-brs3":
            barStyle !== BarStyle.UNDER &&
            barStyle !== BarStyle.DOT &&
            isExpandToFullWidth &&
            !isBgBar
        },
        isExpandToFullWidth && {
          "w-full justify-between": true,
          "h-12 px-1": !isEnableTitleAction,
          "h-[3.2rem] 2k:h-14": isEnableTitleAction
        }
      )}
    >
      {#if title || $$slots.left}
        {@const isEnableTitleActionResolved =
          isEnableTitleAction && !tempTitleWithActionDisabled}
        <div class="flex mo:mr-3 h-full" transition:conditionalTransition>
          <slot name="left">
            <button
              class={cn(
                "flex items-center gap-2",
                {
                  "cursor-default text-h4 text-fgs2 px-3 py-0.5":
                    !isEnableTitleActionResolved,
                  "text-h5 px-8 border-r border-brs3":
                    isEnableTitleActionResolved
                },
                isEnableTitleActionResolved && {
                  "text-aps1 bg-aps3": value === titleValue,
                  [`text-fgs2 hover:${bg(parentBgIndex)}`]: value !== titleValue
                }
              )}
              on:click={() => {
                if (isEnableTitleActionResolved) {
                  value = titleValue;
                  dispatch("switch", titleValue);
                }
              }}
            >
              {#if isEnableTitleActionResolved}
                <Icon
                  icon="home"
                  class={cn({
                    "text-aps1": value === titleValue
                  })}
                  size={Size.sm}
                />
              {/if}
              {title}
            </button>
          </slot>
        </div>
      {/if}
      <div
        bind:this={child}
        class={cn("flex items-center", bg(parentBgIndex - 1), {
          "h-full": style === PanelSwitcherStyle.BAR,
          "overflow-x-auto mr-auto": isExpandToFullWidth,
          "min-w-fit": !isExpandToFullWidth,
          "border-b border-brs3":
            ((style === PanelSwitcherStyle.BAR &&
              barStyle !== BarStyle.UNDER &&
              barStyle !== BarStyle.DOT) ||
              style === PanelSwitcherStyle.SNAKE) &&
            !isExpandToFullWidth &&
            !isInversePlacement
        })}
      >
        {#each _items as item, index (item.value)}
          <PanelSwitcherItem
            {item}
            {size}
            {style}
            isInEditMode={_items.length > 1 && isInEditMode}
            {barStyle}
            {isInversePlacement}
            {parentBgIndex}
            {isRearrangeableByDefault}
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
        {#if isInEditMode && !$view.isConstrainedWidth}
          <PanelSwitcherItem
            item={{ label: addText ?? "Add", value: "$add" }}
            {size}
            {style}
            isInEditMode={true}
            {barStyle}
            {isInversePlacement}
            {parentBgIndex}
            bind:triggerItemEdit
            on:add
          />
        {/if}
      </div>
      {#if $$slots.right}
        <span class="ml-4">
          <slot name="right">
            <span>no content</span>
          </slot>
        </span>
      {/if}
    </div>
  {/key}
{/if}

<svelte:document
  on:keydown={(event) => {
    try {
      if (isPreventTabShortcut || event.key !== KeyboardKey.TAB) return;
      if (!isTopmostPanelSwitcher()) return;
      const isMetaShiftCombination = event.metaKey && event.shiftKey;
      const isTextInputSource = isTextElement(event.target);
      if (isTextInputSource && !isMetaShiftCombination) return;
      const isBackward = event.shiftKey;
      event.preventDefault();
      event.stopPropagation();
      const dispatchSwitch = (val) => {
        value = val;
        dispatch("switch", val);
      };

      const isTitleActive = isEnableTitleAction && value === titleValue;
      if (isBackward) {
        if (isTitleActive) {
          const previous = _items[_items.length - 1]?.value;
          if (previous) dispatchSwitch(previous);
          return;
        }
        const currentIndex = _items.findIndex((item) => item.value === value);
        if (currentIndex === -1) {
          const fallback = _items[_items.length - 1]?.value;
          if (fallback) dispatchSwitch(fallback);
          return;
        }
        if (currentIndex === 0) {
          if (isEnableTitleAction) {
            dispatchSwitch(titleValue);
            return;
          }
          const previous = _items[_items.length - 1]?.value;
          if (previous) dispatchSwitch(previous);
          return;
        }
        const previous = _items[currentIndex - 1]?.value;
        if (previous) dispatchSwitch(previous);
        return;
      }

      if (isTitleActive) {
        const next = _items[0]?.value;
        if (next) dispatchSwitch(next);
        return;
      }

      const currentIndex = _items.findIndex((item) => item.value === value);
      if (currentIndex === -1 || currentIndex + 1 >= _items.length) {
        if (isEnableTitleAction) {
          dispatchSwitch(titleValue);
          return;
        }
        const next = _items[0]?.value;
        if (next) dispatchSwitch(next);
        return;
      }

      const next = _items[currentIndex + 1]?.value;
      if (next) dispatchSwitch(next);
    } catch (error) {
      logger.error({ at: "PanelSwitcher - number shortcut listener", error });
    }
  }}
/>
