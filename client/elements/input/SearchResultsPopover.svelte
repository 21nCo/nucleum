<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import SearchResultItem from "./SearchResultItem.svelte";
  import Button from "../button/Button.svelte";
  import { debouncer } from "$lib/client/utils/utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IResource } from "$lib/client/components/flux/resourceStores/resource.type";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { flux } from "$lib/client/components/flux/flux";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  import { FluxMethod } from "$lib/client/components/flux/flux.type";
  import { extensionFlux } from "$lib/client/components/flux/fluxExtentionMediator";
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  export let searchResultComponent: any = undefined;
  export let searchResultComponentProps: Record<string, unknown> = {};
  export let shortcutTrigger: string | undefined = undefined;
  export let emptyStateLabel: string = "No results found";
  export let isPreventDefaultResults: boolean = false;
  let value: string;
  type SearchItem = Partial<IResource & Record<string, unknown>>;
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
      value = value.split(shortcutTrigger)[1].split(" ")[0];
    }
    // console.log("keyup - search results popover", { event, value });
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
    } else if (event.key === "Enter") {
      if (value && results && results.length > 0) {
        onSearchResultSelection(results[selectedIndex]);
      } else if (results?.length > 0) {
        onSearchResultSelection(results[0]);
      } else {
        //save();
        dispatch("empty-enter", value);
      }
    } else {
      currentValue = value;
      debouncedSearch();
    }
    // dispatch("keyup", { value, event });
  }
  let debouncedSearch = debouncer(search, 100);
  export async function search() {
    isSearchInProgress = true;
    selectedIndex = 0;
    if (!value && isPreventDefaultResults) {
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
    if (searchStoreId) {
      if (isExtensionEnvironment()) {
        results = await extensionFlux({
          method: FluxMethod.SEARCH,
          args: { storeId: searchStoreId, query: value }
        });
      } else {
        results = await flux.search(searchStoreId, value);
      }
    }

    isSearchInProgress = false;
    if (results?.length > 0) {
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

<div class={cn("flex flex-col justify-between max-h-60 h-60 w-full")}>
  <div class="flex flex-col flex-grow items-center w-full">
    {#if results && results.length > 0}
      {#each results as item, index ((item.id ?? "") + item.value)}
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
              {...searchResultComponentProps}
              isActive={selectedIndex === index}
            />
          {:else}
            <span class="truncate">
              {item.label}
            </span>
          {/if}
        </SearchResultItem>
      {/each}
    {:else}
      <div class="flex w-full justify-center p-2 text-b3 text-fgs3">
        {#if isSearchInProgress}
          Searching...
        {:else if results?.length === 0}
          <span>
            {@html renderMdAsHtml(emptyStateLabel)}
          </span>
        {/if}
      </div>
    {/if}
  </div>
  <div class="w-full flex justify-center">
    <Button size={Size.sm} label="close" parentBgIndex={0} on:click={reset} />
  </div>
</div>
