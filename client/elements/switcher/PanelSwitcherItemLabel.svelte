<script lang="ts">
  import {
    PanelSwitcherStyle,
    type PanelSwitcherEditModeOptions
  } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher } from "svelte";
  import Icon from "../Icon.svelte";
  import Button from "../button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import Popover from "../popover/Popover.svelte";
  import TextInput from "../input/TextInput.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import AddNewButton from "../button/AddNewButton.svelte";
  import { tooltip } from "$lib/client/actions/popover.action";
  import { isValidString } from "$lib/shared/utils/text.utils";
  const dispatch = createEventDispatcher();
  export let item: ISelectItem;
  export let isInEditMode: boolean = false;
  export let isDisabled: boolean = false;
  export let size = Size.md;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.BAR;
  export let editModeOptions: PanelSwitcherEditModeOptions | undefined =
    undefined;
  export let isActive: boolean = false;
  export let triggerItemEdit: string | null = null;
  export let isShowNumberShortcut: boolean = false;
  export let index: number = 0;
  $: isAddNewItem = item.value === "$add";
  let labelEditPopoverRef: any;
  let inputRef: any;
  $: if (triggerItemEdit && triggerItemEdit === item.value.toString()) {
    // console.log({ triggerItemEdit, labelEditPopoverRef });
    setTimeout(() => {
      labelEditPopoverRef?.show();
      inputRef?.focus();
    }, 100);
  } else if (triggerItemEdit && triggerItemEdit !== item.value.toString()) {
    labelEditPopoverRef?.hide();
  }
</script>

{#if isAddNewItem}
  <AddNewButton {size} text={item.label} />
{:else if isInEditMode}
  <span class="flex gap-2 items-center">
    <!-- TODO - rearrange - disabling until this feature is complete -->
    <Icon icon="ph:dots-six-vertical-bold" class="text-fgs2" {size} />
    <Popover
      bind:this={labelEditPopoverRef}
      isPreventDefault={!isActive}
      on:hide={() => {
        if (triggerItemEdit) triggerItemEdit = null;
      }}
    >
      <button
        class="flex items-center max-w-36 whitespace-nowrap"
        on:dblclick={() => {
          labelEditPopoverRef.toggle();
        }}
      >
        <div
          class="truncate"
          use:tooltip={{
            text: item.label,
            isEnableOnlyOnTruncate: true
          }}
        >
          {isValidString(item.label) ? item.label : "Untitled"}
        </div>
      </button>
      <button slot="popover" class="w-60 h-20 p-4" on:click|stopPropagation>
        <TextInput
          bind:this={inputRef}
          bind:value={item.label}
          placeholder="Label"
          on:input={(e) => {
            dispatch("change", { ...item });
          }}
        />
      </button>
    </Popover>
    <span class="ml-4">
      <Button
        icon="cross"
        size={Size.sm}
        tooltip={editModeOptions?.removeTooltip ?? "Remove"}
        on:click={(e) => {
          dispatch("remove", item.value);
          e.stopPropagation();
        }}
      />
    </span>
  </span>
{:else}
  <span
    class={cn("flex gap-2 items-center min-w-fit whitespace-nowrap", {
      "text-bgs4": isDisabled
    })}
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={item.icon}
        {size}
        isFilled={isActive}
        class={cn({
          "fill-aps1": isActive
        })}
      />
    {/if}
    <div
      class={cn(
        "flex items-center max-w-36",
        !isActive && {
          "hover:text-fgs2":
            style === PanelSwitcherStyle.BAR ||
            style === PanelSwitcherStyle.SNAKE
        }
      )}
    >
      <span
        class="truncate"
        use:tooltip={{
          text: item.label,
          isEnableOnlyOnTruncate: true
        }}
      >
        {isValidString(item.label) ? item.label : "Untitled"}
      </span>
    </div>
    {#if isShowNumberShortcut}
      <span class="text-b4 text-fgs3 w-4 h-4 bg-bgs2 rounded-md">
        {index + 1}
      </span>
    {/if}
  </span>
{/if}

<!-- {#if isInEditMode && isAddNewItem}
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
{/if} -->
