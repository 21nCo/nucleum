<script lang="ts">
  import { generateUID } from "@21n/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import type { DropdownItem } from "@21n/types/dropdownItem.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import Check from "@21n/icons/Check.svelte";
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import InputBaseElement from "@21n/elements/InputBaseElement.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Orientation } from "@21n/types/direction.enum";
  const dispatch = createEventDispatcher();
  export let options: DropdownItem[];
  export let selected: (string | number)[] = [];
  export let parentBackgroundIndex: number = 1;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let placeholder: string = "Plese select";
  export let containerId = generateUID();
  let isActive: boolean = false;
  $: selectedItems = options.filter((item) =>
    selected.some((x) => x == item.value)
  );
  function onCheckClicked(item: DropdownItem) {
    if (item.disabled) return;
    if (selected.some((x) => x == item.value)) {
      selected = selected.filter((x) => x != item.value);
    } else {
      selected = [...selected, item.value];
    }
    dispatch("select", selected);
  }
</script>

<InputBaseElement
  {label}
  {style}
  bind:isActive
  class={cn("flex justify-between gap-4 items-center", {
    "w-full": !label?.label,
    "w-80":
      label?.label &&
      (label?.orientation === Orientation.Horizontal || !label?.orientation)
  })}
  popoverOptions={{
    isSpanToTriggerWidth: true,
    parentBgIndex: parentBackgroundIndex,
    class: "max-h-60 overflow-y-auto flex flex-col items-start rounded-b-md"
  }}
>
  <div class="flex gap-2">
    {#if selectedItems.length > 0}
      {#each selectedItems.slice(0, 1) as item, index}
        {#if item.icon}
          <Icon icon={item.icon} size={Size.sm} />
        {/if}
        <span class="whitespace-nowrap">
          {item?.label}
        </span>
        {#if index != selectedItems.length - 1}
          ,
        {/if}
      {/each}
      {#if selectedItems.length > 1}
        <span class="text-fgs3">
          +{selectedItems.length - 1}
        </span>
      {/if}
    {:else}
      <span class="text-fgs3">{placeholder}</span>
    {/if}
  </div>
  <Icon icon={isActive ? "chevron-up" : "chevron-down"} size={Size.sm} />
  <slot name="popover" slot="popover">
    {#each options as item, index}
      <button
        class="text-left px-4 py-2 hover:bg-bgs2 w-full {item.disabled
          ? 'text-fgs3'
          : 'text-fgs1'} {index === options.length - 1
          ? 'hover:rounded-b-md'
          : ''}"
        on:click={(event) => {
          onCheckClicked(item);
          event.stopPropagation();
        }}
      >
        <div class="flex gap-2">
          <Check
            isChecked={selected.some((x) => x == item.value)}
            size={Size.sm}
          />
          {#if item.icon}
            <Icon icon={item.icon} size={Size.sm} />
          {/if}
          {item.label ?? item.value}
        </div>
      </button>
    {/each}
  </slot>
</InputBaseElement>
