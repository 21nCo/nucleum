<script lang="ts">
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { resolveBackgroundClass, bgClass } from "$lib/tidy/utils/theme.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import PanelSwitcherItem from "./PanelSwitcherItem.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import appearance from "$lib/tidy/stores/appearance.store";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import type { SelectItem } from "$lib/tidy/types/select.type";
  const dispatch = createEventDispatcher();
  export let items: SelectItem[] | string[];
  export let value: string | undefined = undefined;
  export let activeColor: number | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let parentBackgroundIndex: number = 1;
  export let isInEditMode: boolean = false;
  export let size: Size = Size.md;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  export let isExpandToFullWidth: boolean = false;
  let _items: SelectItem[];
  $: _items = items.every((x) => typeof x === "string")
    ? items.map((x) => ({ label: x, value: x }))
    : items;
  let backgroundColor: string = "";
  let classList: string = "flex ";
  onMount(() => {
    if (value === undefined) value = _items[0]?.value;
    let colors = resolveBackgroundClass(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
    switch (style) {
      case PanelSwitcherStyle.DOT:
        if (size === Size.md || size === Size.lg) {
          classList += " gap-6 items-center ";
        } else if (size === Size.sm) {
          classList += " p-1 gap-6 items-center justify-around ";
        }

        break;
      case PanelSwitcherStyle.TRAIN:
        if (size === Size.md) {
          classList +=
            " min-w-fit border-2 border-brs3 rounded-full " +
            bgClass($appearance, parentBackgroundIndex);
        } else if (size === Size.sm || size === Size.xs) {
          classList +=
            " w-full min-w-fit rounded-md border border-brs3 " +
            bgClass($appearance, parentBackgroundIndex);
        }
        break;
      case PanelSwitcherStyle.DEFAULT:
        classList += " gap-4 rounded-full ";
        break;
      default:
        classList += " items-center ";
        break;
    }
  });
  $: if (isInEditMode && _items[_items.length - 1].value !== "Add") {
    _items.push({ label: "Add", value: "Add" });
    setTimeout(() => {
      // updateParentWidth();
    }, 1000);
    // updateParentWidth();
  } else if (_items[_items.length - 1]?.value === "Add") {
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
    class={cn("relative", {
      "w-full": style === PanelSwitcherStyle.BAR && isExpandToFullWidth,
      "inline-block": style !== PanelSwitcherStyle.BAR || !isExpandToFullWidth
    })}
  >
    <!-- TODO - the styles for isInEditMode and TRAIN type are a workaround for the width not adjusting dynamically on edit mode switch -->
    <div
      bind:this={child}
      class={cn(classList, {
        "pr--2": style === PanelSwitcherStyle.TRAIN && isInEditMode
      })}
    >
      {#each _items as item, index (item.value)}
        <PanelSwitcherItem
          {item}
          {size}
          {activeColor}
          {style}
          {isInEditMode}
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
    <!-- {#if style === PanelSwitcherStyle.BOTTOMBAR || style === PanelSwitcherStyle.BOTTOMBAR_MINI}
    <div
      class="absolute w-full left-0 -bottom-1 {bgClass(
        $userPreferences.theme,
        2
      )}"
      style="height: 5%;"
    />
  {/if} -->
  </div>
{/key}
