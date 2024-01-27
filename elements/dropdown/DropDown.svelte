<script lang="ts">
  import { actIfClickedOutside, generateUID } from "$lib/tidy/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import FormControlLabel from "$lib/tidy/elements/text/FormControlLabel.svelte";
  import {
    DropDownStyle,
    type DropdownItem
  } from "$lib/tidy/types/dropdownItem.type";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import { appEvents, userPreferences } from "$lib/tidy/stores/app.store";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  const dispatch = createEventDispatcher();
  export let items: DropdownItem[];
  export let value: string | number;
  export let parentBackgroundIndex: number = 1;
  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let style: DropDownStyle = DropDownStyle.DEFAULT;
  export let containerId = generateUID();
  export let isActive: boolean = false;
  let isShowOptions: boolean = false;
  let classList = "relative flex flex-col items-start gap-1 w-full";
  $: {
    console.log("isActive ", isActive);
    if (isActive) {
      classList = "relative flex flex-col items-start gap-1 w-full";
      classList +=
        " bg-a1" +
        (!$userPreferences.colorScheme.isActiveFgFg ? " text-bgs1" : "");
    } else classList = "relative flex flex-col items-start gap-1 w-full";
    classList = classList;
  }
  $: selected = items.find((x) => x.value === value) ?? items[0];
  onMount(() => {
    appEvents.subscribe((x: AppEventType) => {
      if (
        x.event === AppEvent.WINDOW_CLICKED &&
        x.value &&
        x.value instanceof PointerEvent
      ) {
        actIfClickedOutside(x.value, `#${containerId}`, () => {
          isShowOptions = false;
        });
      }
    });
  });
</script>

<div id={containerId} class={classList}>
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
      class="absolute max-h-60 overflow-y-auto flex flex-col items-start rounded-b-md search-results {bgClass(
        $userPreferences.theme,
        parentBackgroundIndex
      )}"
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
