<script lang="ts">
  import type { PanelSwitcherEditModeOptions } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher } from "svelte";
  import Icon from "../Icon.svelte";
  import Button from "../button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import Popover from "../popover/Popover.svelte";
  import TextInput from "../input/TextInput.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  const dispatch = createEventDispatcher();
  export let item: ISelectItem;
  export let isInEditMode: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let editModeOptions: PanelSwitcherEditModeOptions | undefined =
    undefined;
  export let isActive: boolean = false;
  export let triggerItemEdit: string | null = null;
  $: isAddNewItem = item.value === "$add";
  let isHoveringOnAddNewItem = false;
  let labelEditPopoverRef: any;
  let inputRef: any;
  $: if (triggerItemEdit && triggerItemEdit === item.value) {
    console.log({ triggerItemEdit });
    labelEditPopoverRef?.show();
    inputRef?.focus();
  } else if (triggerItemEdit && triggerItemEdit !== item.value) {
    labelEditPopoverRef?.hide();
  }
</script>

{#if isInEditMode && isAddNewItem}
  <button
    class="flex items-center hover:text-aps1 gap-1"
    on:mouseenter={() => (isHoveringOnAddNewItem = true)}
    on:mouseleave={() => (isHoveringOnAddNewItem = false)}
  >
    <Icon
      icon="plus"
      {size}
      class={cn({
        "stroke-aps1": isHoveringOnAddNewItem
      })}
    />
    <span class="min-w-fit whitespace-nowrap">
      {editModeOptions?.addText ?? "Add new"}
    </span>
  </button>
{:else if isInEditMode}
  <span class="flex gap-2 items-center">
    <!-- TODO - rearrange - disabling until this feature is complete -->
    <!-- <Icon icon="grab" {size} /> -->
    <Popover
      bind:this={labelEditPopoverRef}
      isPreventDefault={!isActive}
      on:hide={() => {
        if (triggerItemEdit) triggerItemEdit = null;
      }}
    >
      <button
        class="min-w-fit whitespace-nowrap"
        on:dblclick={() => {
          labelEditPopoverRef.toggle();
        }}
      >
        {item.label}
      </button>
      <button slot="popover" class="w-60 h-20 p-4" on:click|stopPropagation>
        <TextInput
          bind:this={inputRef}
          bind:value={item.label}
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
  <span class="min-w-fit whitespace-nowrap">
    {item.label}
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
