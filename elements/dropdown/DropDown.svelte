<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FormControlLabel from "$lib/tidy/elements/text/formLabel/FormControlLabel.svelte";
  import {
    DropDownStyle,
    type DropdownItem
  } from "$lib/tidy/types/dropdownItem.type";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import appearance from "$lib/tidy/stores/appearance.store";
  import BackgroundElement from "../style/BackgroundElement.svelte";
  import Popover from "../popover/Popover.svelte";
  const dispatch = createEventDispatcher();
  export let items: DropdownItem[];
  export let value: string | number;
  export let parentBackgroundIndex: number = 1;
  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let style: DropDownStyle = DropDownStyle.DEFAULT;
  export let isActive: boolean = false;
  let isShowOptions: boolean = false;
  let classList = "relative flex flex-col items-start gap-1 w-full";
  $: {
    console.log("isActive ", isActive);
    if (isActive) {
      classList = "relative flex flex-col items-start gap-1 w-full";
      classList +=
        " bg-aps1" +
        (!$appearance.colorScheme.isActiveFgFg ? " text-bgs1" : "");
    } else classList = "relative flex flex-col items-start gap-1 w-full";
    classList = classList;
  }
  $: selected = items.find((x) => x.value === value) ?? items[0];
</script>

<Popover>
  <div class={classList} slot="trigger">
    {#if label}
      <FormControlLabel {label} info={{ body: info ?? "" }} />
    {/if}
    <button
      class="flex w-full justify-between gap-4 items-center p-2 {isShowOptions
        ? 'rounded-t-md'
        : 'rounded-md'} {style === DropDownStyle.OUTLINED
        ? 'border border-bgs3'
        : style === DropDownStyle.PANEL_SWITCH
          ? 'text-h4 font-medium'
          : ''}"
    >
      <div class="flex gap-2">
        {#if selected.icon}
          <Icon icon={selected.icon} size={Size.sm} />
        {/if}
        {selected?.label}
      </div>
      <Icon icon={isShowOptions ? "chevup" : "chevdown"} size={Size.sm} />
    </button>
  </div>
  <svelte:fragment slot="popover">
    <BackgroundElement
      class="absolute max-h-60 overflow-y-auto flex flex-col items-start rounded-b-md search-results"
      parentBgIndex={parentBackgroundIndex}
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
            value = item.value;
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
    </BackgroundElement>
  </svelte:fragment>
</Popover>
