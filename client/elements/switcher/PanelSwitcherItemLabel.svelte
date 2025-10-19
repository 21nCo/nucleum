<script lang="ts">
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle,
    type PanelSwitcherEditModeOptions
  } from "@21n/types/switcher.enum";
  import { createEventDispatcher } from "svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { Size } from "@21n/types/size.enum";
  import type { ISelectItem } from "@21n/types/select.type";
  import Popover from "@21n/elements/popover/Popover.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import AddNewButton from "@21n/elements/button/AddNewButton.svelte";
  import { tooltip } from "@21n/actions/popover.action";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import Badge from "@21n/elements/text/Badge.svelte";
  const dispatch = createEventDispatcher();
  export let item: ISelectItem;
  export let isInEditMode: boolean = false;
  export let isDisabled: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.BAR;
  export let editModeOptions: PanelSwitcherEditModeOptions | undefined =
    undefined;
  export let isActive: boolean = false;
  export let triggerItemEdit: string | null = null;
  export let parentBgIndex: number = 1;
  export let activeItemStrength: PanelSwitcherActiveItemStrength =
    PanelSwitcherActiveItemStrength.DEFAULT;
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
    <Icon icon="rearrange" class="text-fgs2" {size} />
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
          on:debouncedChange={(e) => {
            dispatch("debouncedChange", { ...item });
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
        class={cn(
          "transition-colors",
          {
            "text-ccs1": isActive && style !== PanelSwitcherStyle.TRAIN
          },
          style === PanelSwitcherStyle.TRAIN &&
            !isActive && {
              "group-hover:text-fgs1":
                activeItemStrength !== PanelSwitcherActiveItemStrength.STRONG,
              "text-fgs2":
                activeItemStrength === PanelSwitcherActiveItemStrength.DEFAULT,
              "text-fgs3":
                activeItemStrength === PanelSwitcherActiveItemStrength.SUBTLE
            },
          style === PanelSwitcherStyle.TRAIN &&
            isActive && {
              "text-cbg":
                activeItemStrength === PanelSwitcherActiveItemStrength.STRONG,
              "text-ccs1":
                activeItemStrength === PanelSwitcherActiveItemStrength.DEFAULT
            }
        )}
      />
    {/if}
    <div
      class={cn(
        "flex items-center max-w-36",
        !isActive && {
          "group-hover:text-fgs2":
            style === PanelSwitcherStyle.BAR ||
            style === PanelSwitcherStyle.SNAKE
        },
        !isActive &&
          style === PanelSwitcherStyle.TRAIN && {
            "group-hover:text-fgs1":
              activeItemStrength !== PanelSwitcherActiveItemStrength.STRONG,
            "text-fgs2":
              activeItemStrength === PanelSwitcherActiveItemStrength.DEFAULT,
            "text-fgs3":
              activeItemStrength === PanelSwitcherActiveItemStrength.SUBTLE
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
      {#if item.badge}
        <span class="ml-2">
          <Badge
            {size}
            text={item.badge}
            isApplyCustomColor={isActive}
            {parentBgIndex}
          />
        </span>
      {/if}
    </div>
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
