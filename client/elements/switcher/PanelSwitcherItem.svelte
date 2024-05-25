<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import {
    PanelSwitcherStyle,
    SelectionItemActiveStyle
  } from "$lib/client/types/switcher.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { bgClass, textColorClass } from "$lib/client/utils/theme.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import Icon from "../Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { SelectItem } from "$lib/client/types/select.type";
  import TextInput from "../input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import Popover from "../popover/Popover.svelte";
  const dispatch = createEventDispatcher();
  export let item: SelectItem;
  export let size: Size;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: number | undefined = undefined;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  export let isInEditMode: boolean = false;
  let labelEditPopoverRef: any;
  $: isAddNewItem = item.value === "Add";
</script>

{#if style === PanelSwitcherStyle.BAR}
  <button
    class="flex relative bg-transparent {size === Size.md
      ? 'px-6'
      : size === Size.sm
        ? 'px-4'
        : 'px-3'}"
    on:click
    disabled={isDisabled}
  >
    <div
      class="font-medium min-w-fit {isActive
        ? 'activeFgColor'
        : 'text-fgs4'} {size === Size.md && $view.isPortrait
        ? 'text-base'
        : size === Size.sm && $view.isPortrait
          ? 'text-b2'
          : size === Size.sm
            ? 'text-base'
            : size === Size.xs
              ? 'text-b2'
              : 'text-h4'}"
    >
      {item.label}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-full rounded-lg left-0 -bottom-1 z-10 activeBgColor"
        style="height: 5%;"
      />
    {:else}
      <button
        class="absolute w-full {bgClass($appearance, 2)} left-0 -bottom-1 z-10"
        style="height: 5%;"
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.DOT}
  <button class="relative min-w-fit" on:click disabled={isDisabled}>
    <div
      class="{size === Size.sm
        ? 'text-b2'
        : size === Size.md
          ? 'text-base'
          : $view.isPortrait
            ? 'text-h4'
            : 'text-h3'} {isActive ? 'activeFgColor' : 'text-fgs3'}"
    >
      {item.label}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-1 h-1 -bottom-1 rounded-full activeBgColor"
        style="left: 40%;"
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.TRAIN}
  <button
    class={cn("relative min-w-fit", {
      "rounded-full px-6 py-3": size === Size.md,
      "rounded-md px-3 py-1 w-24": size === Size.sm,
      "rounded-md px-2 py-0.5 w-16": size === Size.xs,
      activeBgColor: isActive
    })}
    on:click={() => {
      if (isAddNewItem) {
        dispatch("add");
      } else {
        dispatch("click", item.value);
      }
    }}
    disabled={isDisabled}
  >
    <div
      class={cn(
        "flex gap-1 justify-center items-center",
        textColorClass(
          $appearance,
          ColorStrength.Normal,
          isActive,
          activeColor
        ),
        {
          "text-base font-medium": size === Size.md && $view.isPortrait,
          "text-b2": size === Size.sm || size === Size.xs,
          "text-fgs3": isAddNewItem
        }
      )}
    >
      {#if isInEditMode && isAddNewItem}
        <Icon icon="plus" {size} />
      {/if}
      {#if isInEditMode && !isAddNewItem}
        <div class="flex gap-4">
          <Popover bind:this={labelEditPopoverRef} isPreventDefault={true}>
            <div slot="trigger">
              {item.label}
            </div>
            <div slot="popover" class="w-60 h-20 p-4">
              <TextInput
                bind:value={item.label}
                on:input={(e) => {
                  dispatch("change", { ...item });
                }}
              />
            </div>
          </Popover>
          <div class="flex gap-2">
            <Icon
              icon="pencil-square"
              {size}
              {isActive}
              selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
              on:click={(e) => {
                labelEditPopoverRef.toggle();
                e.stopPropagation();
              }}
            />
            <Icon
              icon="cross-circled"
              {size}
              {isActive}
              selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
              on:click={(e) => {
                dispatch("remove", item.value);
                e.stopPropagation();
              }}
            />
          </div>
        </div>
      {:else}
        {item.label}
      {/if}
    </div>
  </button>
{/if}

<style>
  .activeBgColor {
    background-color: var(--customcolor, rgba(var(--colors-aps1), 1));
    /* transition: background-color 0.2s ease-in-out; */
  }
  .activeFgColor {
    color: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
</style>
