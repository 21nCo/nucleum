<script lang="ts">
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import {
    resolveBackgroundClass,
    bgClass
  } from "$lib/client/utils/theme.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import PanelSwitcherItem from "./PanelSwitcherItem.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import appearance from "$lib/client/stores/appearance.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { SelectItem } from "$lib/client/types/select.type";
  import BackgroundElement from "../style/BackgroundElement.svelte";
  import Text from "../text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { fade, fly, slide } from "svelte/transition";
  const dispatch = createEventDispatcher();
  export let items: SelectItem[] | string[];
  export let value: string | undefined = undefined;
  export let activeColor: number | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let parentBackgroundIndex: number = 1;
  export let isInEditMode: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  export let isExpandToFullWidth: boolean = false;
  export let title: string = "";
  export let barStyle: BarStyle = BarStyle.EXACT;
  export let triggerItemEdit: string | null = null;
  let _items: SelectItem[];
  $: _items = items.every((x) => typeof x === "string")
    ? items.map((x) => ({ label: x, value: x }))
    : items;
  let backgroundColor: string = "";
  // let classList: string = "flex ";
  onMount(() => {
    if (value === undefined) value = _items[0]?.value;
    console.log({ value });
    // let colors = resolveBackgroundClass(parentBackgroundIndex);
    // backgroundColor = colors.backgroundColor;
    // switch (style) {
    //   case PanelSwitcherStyle.DOT:
    //     if (size === Size.md || size === Size.lg) {
    //       classList += " gap-6 items-center ";
    //     } else if (size === Size.sm) {
    //       classList += " p-1 gap-6 items-center justify-around ";
    //     }

    //     break;
    //   case PanelSwitcherStyle.TRAIN:
    //     if (size === Size.md) {
    //       classList +=
    //         " min-w-fit border-2 border-brs3 rounded-full " +
    //         bgClass($appearance, parentBackgroundIndex);
    //     } else if (size === Size.sm || size === Size.xs) {
    //       classList +=
    //         " w-full min-w-fit rounded-md border border-brs3 " +
    //         bgClass($appearance, parentBackgroundIndex);
    //     }
    //     break;
    //   case PanelSwitcherStyle.DEFAULT:
    //     classList += " gap-4 rounded-full ";
    //     break;
    //   default:
    //     classList += " items-center ";
    //     break;
    // }
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
    <BackgroundElement
      bind:this={child}
      class={cn("flex min-w-fit items-center", {
        "border-b border-brs3":
          ((style === PanelSwitcherStyle.BAR &&
            barStyle != BarStyle.UNDER &&
            barStyle != BarStyle.DOT) ||
            style === PanelSwitcherStyle.SNAKE) &&
          !isExpandToFullWidth,
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
      })}
      parentBgIndex={style === PanelSwitcherStyle.TRAIN
        ? parentBackgroundIndex
        : 0}
    >
      {#if title || $$slots.left}
        <span class="mr-6" transition:fly={{ y: -100, duration: 300 }}>
          <slot name="left">
            <Text content={title} style={TextStyle.PANEL_HEADING_SMALL} />
          </slot>
        </span>
      {/if}
      {#each _items as item, index (item.value)}
        <PanelSwitcherItem
          {item}
          {size}
          {activeColor}
          {style}
          {isInEditMode}
          {barStyle}
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
    </BackgroundElement>
    {#if $$slots.right}
      <span class="ml-6">
        <slot name="right">
          <span>no content</span>
        </slot>
      </span>
    {/if}
  </div>
{/key}
