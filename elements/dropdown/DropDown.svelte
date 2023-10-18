<script lang="ts">
  import { generateBackgroudColor } from "$lib/tidy/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import FormControlLabel from "$lib/tidy/elements/text/FormControlLabel.svelte";
  import {
    DropDownStyle,
    type DropdownItem,
  } from "$lib/tidy/types/dropdownItem.type";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  const dispatch = createEventDispatcher();
  export let items: DropdownItem[];
  export let selectedIndex: number = 0;
  export let parentBackgroundIndex: number = 0;
  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let style: DropDownStyle = DropDownStyle.DEFAULT;
  let isShowOptions: boolean = false;
  let backgroundColor: string;
  let activeBackgroundColor: string;
  $: selected = items[selectedIndex];
  onMount(() => {
    const colors = generateBackgroudColor(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
    activeBackgroundColor = colors.activeBackgroundColor;
  });
</script>

<div class="relative flex flex-col items-start gap-1 w-full">
  {#if label}
    <FormControlLabel {label} {info} />
  {/if}
  <button
    class="flex w-full justify-between gap-4 items-center p-2 {isShowOptions
      ? 'rounded-t-md'
      : 'rounded-md'} {style === DropDownStyle.OUTLINED
      ? 'border border-bgs3'
      : style === DropDownStyle.PANEL_SWITCH
      ? 'text-h4 font-medium'
      : ''}"
    on:click={() => {
      isShowOptions = !isShowOptions;
    }}
  >
    <div class="flex gap-2">
      {#if selected.icon}
        <Icon icon={selected.icon} size={Size.sm} />
      {/if}
      {selected?.label}
    </div>
    <Icon icon={isShowOptions ? "chevup" : "chevdown"} size={Size.sm} />
  </button>

  {#if isShowOptions}
    <div
      class="flex flex-col items-start rounded-b-md search-results {backgroundColor}"
    >
      {#each items as item, index}
        <button
          class="text-left px-4 py-2 hover:bg-bgs4 w-full {item.disabled
            ? 'text-fgs3'
            : 'text-fgs1'} {index === items.length - 1
            ? 'hover:rounded-b-md'
            : ''}"
          on:click={() => {
            if (item.disabled) return;
            selectedIndex = index;
            isShowOptions = false;
            dispatch("select", item.value);
          }}
        >
          <div class="flex gap-2">
            {#if item.icon}
              <Icon icon={item.icon} size={Size.sm} />
            {/if}
            {item.label}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    border-top: none;
    z-index: 10;
  }
</style>
