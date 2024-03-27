<script lang="ts">
  import { actIfClickedOutside, generateUID } from "$lib/tidy/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import FormControlLabel from "$lib/tidy/elements/text/formLabel/FormControlLabel.svelte";
  import {
    DropDownStyle,
    type DropdownItem
  } from "$lib/tidy/types/dropdownItem.type";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import { appEvents } from "$lib/tidy/stores/app.store";
  import Check from "$lib/tidy/icons/Check.svelte";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import BackgroundElement from "../style/BackgroundElement.svelte";
  const dispatch = createEventDispatcher();
  export let options: DropdownItem[];
  export let selected: (string | number)[] = [];
  export let parentBackgroundIndex: number = 1;
  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let style: DropDownStyle = DropDownStyle.DEFAULT;
  export let placeholder: string = "Plese select";
  export let containerId = generateUID();
  let isShowOptions: boolean = false;
  $: selectedItems = options.filter((item) =>
    selected.some((x) => x == item.value)
  );
  onMount(() => {
    const sub = appEvents.subscribe((x: AppEventType) => {
      if (
        x.event === AppEvent.WINDOW_CLICKED &&
        x.value &&
        x.value instanceof PointerEvent
      ) {
        actIfClickedOutside(x.value, containerId, () => {
          isShowOptions = false;
        });
      }
    });
    return () => {
      sub();
    };
  });
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

<div id={containerId} class="relative flex flex-col items-start gap-1 w-full">
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
    <Icon icon={isShowOptions ? "chevup" : "chevdown"} size={Size.sm} />
  </button>

  {#if isShowOptions}
    <BackgroundElement
      classList="absolute max-h-60 overflow-y-auto flex flex-col items-start rounded-b-md search-results"
      parentBgIndex={parentBackgroundIndex}
    >
      {#each options as item, index}
        <button
          class="text-left px-4 py-2 hover:bg-bgs4 w-full {item.disabled
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
            <Check isChecked={selected.some((x) => x == item.value)} />
            {#if item.icon}
              <Icon icon={item.icon} size={Size.sm} />
            {/if}
            {item.label}
          </div>
        </button>
      {/each}
    </BackgroundElement>
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
