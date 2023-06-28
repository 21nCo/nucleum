<script lang="ts">
  import { generateBackgroudColor } from "$lib/tidy/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import FormControlLabel from "$lib/tidy/elements/text/FormControlLabel.svelte";
  import type { DropdownItem } from "$lib/tidy/types/dropdownItem.type";
  import DropDownArrow from "$lib/tidy/icons/DropdownArrow.svelte";
  const dispatch = createEventDispatcher();
  export let items: DropdownItem[];
  export let selected: DropdownItem = items[0];
  export let parentBackgroundIndex: number = 0;
  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  let isShowOptions: boolean = false;
  let backgroundColor: string;
  let activeBackgroundColor: string;
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
  <div class="flex w-full outline outline-2 outline-fgs3 p-2 rounded-sm">
    <button
      class=" grow text-left"
      on:click={() => {
        isShowOptions = !isShowOptions;
      }}
    >
      {selected.label}
    </button>
    <div class="flex flex-col justify-center">
      <DropDownArrow direction={isShowOptions ? "up" : "down"} />
    </div>
  </div>

  {#if isShowOptions}
    <div class="flex flex-col items-start search-results {backgroundColor}">
      {#each items as item}
        <button
          class="text-left px-4 py-2 hover:bg-bgs4 w-full {item.disabled
            ? 'text-fgs3'
            : 'text-fgs1'}"
          on:click={() => {
            if (item.disabled) return;
            selected = item;
            isShowOptions = false;
            dispatch("select", item.value);
          }}
        >
          {item.label}
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
