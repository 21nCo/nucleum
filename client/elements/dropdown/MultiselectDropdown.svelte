<script lang="ts">
  import { generateUID } from "$lib/client/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Check from "$lib/client/icons/Check.svelte";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import InputBaseElement from "../InputBaseElement.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Orientation } from "$lib/client/types/direction.enum";
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
      {#each selectedItems as item, index}
        {#if item.icon}
          <Icon icon={item.icon} size={Size.sm} />
        {/if}
        {item?.label}
        {#if index != selectedItems.length - 1}
          ,
        {/if}
      {/each}
    {:else}
      <span class="text-fgs3">{placeholder}</span>
    {/if}
  </div>
  <Icon icon={isActive ? "chevup" : "chevdown"} size={Size.sm} />
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
