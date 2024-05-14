<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import SearchResultItem from "./SearchResultItem.svelte";
  import type { DbRecordWithLabel } from "$lib/tidy/types/dbrecord.type";
  import Button from "../button/Button.svelte";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import { debouncer } from "$lib/tidy/utils/utils";
  import InputBaseElement from "../InputBaseElement.svelte";
  import {
    InputStyle,
    type InputLabel,
    type PopoverInputOptions
  } from "$lib/tidy/types/input.type";
  export let value: any;
  export let placeholder: string | undefined = undefined;
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let id: string = "";
  export let icon: string | undefined = undefined;
  export let popoverOptions: PopoverInputOptions | undefined = undefined;
  type SearchItem = Partial<DbRecordWithLabel & Record<string, unknown>>;
  let results: SearchItem[] = [];
  let selectedIndex: number = 0;
  let previousValue: string = "";
  let currentValue: string;
  let isSearchInProgress: boolean = false;
  let isFocused: boolean = false;
  export function focus() {
    if (inputRef) inputRef.focus();
  }
  export function blur() {
    if (inputRef) inputRef.blur();
  }
  export function reset() {
    resetSearch();
    value = "";
  }
  let inputRef: any;
  export let isDisabled = false;
  let inputClasses: string =
    "text-input w-full bg-transparent focus:outline-none focus:border-none";
  const dispatch = createEventDispatcher();
  onMount(() => {
    inputClasses = inputClasses + " " + resolveStyles().join(" ");
  });

  function resolveStyles() {
    let styles: string[] = [];
    if (icon) {
      styles.push("pl-8");
    }
    return styles;
  }
  function onSearchResultSelection(item: SearchItem) {
    dispatch("select", { item });
    hide();
  }
  function resetSearch() {
    results = [];
    selectedIndex = 0;
    hide();
  }
  function handleKeyUpForSearch(event: any) {
    if (event.key === "Escape") {
      resetSearch();
      inputRef.blur();
      dispatch("blur");
    } else if (event.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1);
      if (selectedIndex === results?.length) {
        selectedIndex = 0;
      }
    } else if (event.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, -1);
      if (selectedIndex === -1) {
        selectedIndex = results?.length;
      }
    } else if (event.key === "Backspace") {
      previousValue = currentValue;
      currentValue = (event.target as HTMLInputElement).value;
      if (previousValue?.length > currentValue.length) {
        const deletedChar = previousValue.charAt(previousValue.length - 1);
        if (deletedChar === "#") {
          //
        }
      }
      debouncedSearch();
    } else if (event.key === "Enter" && value) {
      if (results && results.length > 0) {
        onSearchResultSelection(results[selectedIndex]);
      } else {
        //save();
      }
    } else {
      currentValue = (event.target as HTMLInputElement).value;
      debouncedSearch();
    }
    dispatch("keyup", { value, event });
  }
  let debouncedSearch = debouncer(search, 100);
  async function search() {
    isSearchInProgress = true;
    selectedIndex = 0;
    if (!value) {
      results = [];
      return;
    }
    if (searchCallback) {
      let result = await searchCallback(value);
      if (result) results = result;
      isSearchInProgress = false;
      if (results.length > 0) {
        show();
      }
      return;
    }
    if (searchStoreId) results = await dataManager.search(searchStoreId, value);
    isSearchInProgress = false;
    if (results.length > 0) {
      show();
    }
  }

  let popoverRef: any;
  function show() {
    popoverRef?.showPopover();
  }
  function hide() {
    popoverRef?.hidePopover();
  }
</script>

<InputBaseElement
  bind:this={popoverRef}
  popoverOptions={{
    class: "overflow-y-auto flex flex-col justify-between gap-1 items-start",
    isSpanToTriggerWidth: true,
    isPreventDefault: true,
    ...popoverOptions
  }}
  {label}
  {style}
  {isFocused}
  class="w-full"
>
  <input
    {id}
    class={inputClasses}
    bind:value
    on:change|stopPropagation
    on:keydown
    on:keyup|stopPropagation={handleKeyUpForSearch}
    on:blur
    on:blur={() => {
      isFocused = false;
      dispatch("blur");
    }}
    on:focus={() => {
      isFocused = true;
      dispatch("focus");
    }}
    type="text"
    {placeholder}
    disabled={isDisabled}
    bind:this={inputRef}
  />
  <slot name="popover" slot="popover">
    <div class={results?.length > 5 ? "max-h-60 h-60" : "h-48"}>
      <div class="flex flex-col flex-grow items-center w-full">
        {#if results && results.length > 0}
          {#each results as item, index}
            <SearchResultItem
              label={item.label ??
                ("name" in item && typeof item.name == "string"
                  ? item.name
                  : "")}
              isActive={selectedIndex === index}
              on:click={() => {
                onSearchResultSelection(item);
              }}
            />
          {/each}
        {:else}
          <div class="flex w-full justify-center p-2 text-b3 text-fgs3">
            {#if isSearchInProgress}
              Searching...
            {:else if results.length === 0}
              No results found
            {/if}
          </div>
        {/if}
      </div>
      <div class="w-full flex justify-center">
        <Button
          size={Size.sm}
          label="close"
          parentBackgroundIndex={0}
          on:click={() => {
            value = "";
            resetSearch();
          }}
        />
      </div>
    </div>
  </slot>
</InputBaseElement>

<style>
  input::placeholder {
    font-weight: lighter;
    /* font-style: italic; */
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
