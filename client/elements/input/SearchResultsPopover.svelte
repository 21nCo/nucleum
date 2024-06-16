<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import SearchResultItem from "./SearchResultItem.svelte";
  import type { DbRecordWithLabel } from "$lib/client/types/dbrecord.type";
  import Button from "../button/Button.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { debouncer } from "$lib/client/utils/utils";
  import { cn } from "$lib/client/utils/ui.utils";
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  export let searchResultComponent: any = undefined;
  export let shortcutTrigger: string | undefined = undefined;
  let value: string;
  type SearchItem = Partial<DbRecordWithLabel & Record<string, unknown>>;
  let results: SearchItem[] = [];
  let selectedIndex: number = 0;
  let previousValue: string = "";
  let currentValue: string;
  let isSearchInProgress: boolean = false;
  export function reset() {
    resetSearch();
    value = "";
    dispatch("reset");
  }
  const dispatch = createEventDispatcher();

  function onSearchResultSelection(item: SearchItem) {
    dispatch("select", { item });
    hide();
  }
  function resetSearch() {
    results = [];
    selectedIndex = 0;
    hide();
  }
  export function keyup(event: any) {
    value =
      (event.target as HTMLInputElement).value ??
      (event.target as HTMLElement).innerText;
    if (shortcutTrigger && value?.includes(shortcutTrigger)) {
      value = value.split(shortcutTrigger)[1];
    }
    console.log("keyup - search results popover", { event, value });
    if (event.key === "Escape") {
      resetSearch();
      // inputRef.blur();
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
      currentValue = value;
      if (previousValue?.length > currentValue?.length) {
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
      currentValue = value;
      debouncedSearch();
    }
    // dispatch("keyup", { value, event });
  }
  let debouncedSearch = debouncer(search, 100);
  async function search() {
    isSearchInProgress = true;
    selectedIndex = 0;
    if (!value) {
      results = [];
      hide();
      isSearchInProgress = false;
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
  function show() {
    dispatch("show");
  }
  function hide() {
    dispatch("hide");
  }
</script>

<div
  class={cn("flex flex-col justify-between", {
    "max-h-60 h-60": results?.length > 5,
    "h-48": results?.length <= 5
  })}
>
  <div class="flex flex-col flex-grow items-center w-full">
    {#if results && results.length > 0}
      {#each results as item, index (item.id)}
        <SearchResultItem
          label={item.label ??
            ("name" in item && typeof item.name == "string" ? item.name : "")}
          isActive={selectedIndex === index}
          on:click={() => {
            onSearchResultSelection(item);
          }}
        >
          {#if searchResultComponent}
            <svelte:component
              this={searchResultComponent}
              {item}
              isActive={selectedIndex === index}
            />
          {:else}
            <span>
              {item.label}
            </span>
          {/if}
        </SearchResultItem>
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
      on:click={reset}
    />
  </div>
</div>
