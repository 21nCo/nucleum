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
  import { logger } from "$lib/client/components/debug/logger.client";
  import Icon from "../Icon.svelte";
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  export let searchResultComponent: any = undefined;
  export let searchResultComponentProps: Record<string, unknown> = {};
  /**
   * @deprecated use shortcutTriggers instead
   */
  export let shortcutTrigger: string | undefined = undefined;
  export let shortcutTriggers: string[] = [];
  export let emptyStateLabel: string = "No results found";
  export let isPreventDefaultResults: boolean = false;
  export let isInlineContext: boolean = false;
  export let isAlwaysShowSearchFeedback: boolean = false;
  export let bottomMessage: string | undefined = undefined;
  let value: string;
  type SearchItem = Partial<IResource & Record<string, unknown>>;
  let results: SearchItem[] = [];
  let selectedIndex: number = 0;
  let previousValue: string = "";
  let currentValue: string;
  let isSearchInProgress: boolean = !isPreventDefaultResults;
  export function reset() {
    resetSearch();
    value = "";
    dispatch("reset");
  }
  const dispatch = createEventDispatcher();

  function onSearchResultSelection(item: SearchItem, e?: MouseEvent) {
    dispatch("select", { item, event: e });
    hide();
  }
  function resetSearch() {
    results = [];
    selectedIndex = 0;
    hide();
  }

  export function keydown(event: any) {
    logger.log({ at: "SearchResultsPopover - keydown", event });
    if (event.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1);
      if (selectedIndex === results?.length) {
        selectedIndex = 0;
      }
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, -1);
      if (selectedIndex === -1) {
        selectedIndex = results?.length;
      }
      event.preventDefault();
    }
  }

  export function keyup(event: any) {
    value =
      (event.target as HTMLInputElement).value ??
      (event.target as HTMLElement).innerText;
    if (shortcutTrigger && value?.includes(shortcutTrigger)) {
      value = value.split(shortcutTrigger)[1].split(" ")[0];
    }
    // console.log({ shortcutTriggers, value });
    if (
      shortcutTriggers.length > 0 &&
      shortcutTriggers.some((trigger) => value.includes(trigger))
    ) {
      let trigger = shortcutTriggers.find((trigger) => value.includes(trigger));
      if (trigger) {
        value = value.split(trigger)[1].split("\u200b")[0];
      }
    }
    // console.log("keyup - search results popover", { event, value });
    if (event.key === "Escape") {
      resetSearch();
      // inputRef.blur();
      dispatch("blur");
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
      if (results && results.length > 0) {
        onSearchResultSelection(results[selectedIndex]);
      } else {
        //save();
        dispatch("empty-enter", { event, value });
      }
    } else if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      currentValue = value;
      debouncedSearch();
    }
    // dispatch("keyup", { value, event });
  }
  let debouncedSearch = debouncer(search, 500);
  export async function search() {
    isSearchInProgress = true;
    selectedIndex = 0;
    results = [];
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

<div
  class={cn("flex flex-col justify-between  w-full", {
    "max-h-72 h-72": !isInlineContext,
    "h-full": isInlineContext
  })}
>
  <div class="flex flex-col flex-grow items-center w-full">
    {#if isAlwaysShowSearchFeedback && isSearchInProgress}
      <span class="flex items-center gap-2 p-2">
        <Icon icon="svg-spinners:3-dots-fade" />
        <span class="text-b3 text-fgs3">Searching...</span>
      </span>
    {:else if results && results.length > 0}
      {#each results as item, index ((item.id ?? "") + item.value)}
        <SearchResultItem
          label={item.label ??
            ("name" in item && typeof item.name == "string" ? item.name : "")}
          isActive={selectedIndex === index}
          on:click={(e) => {
            onSearchResultSelection(item, e);
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
          <span class="flex items-center gap-2 p-2">
            <Icon icon="svg-spinners:3-dots-fade" />
            <span class="text-b3 text-fgs3">Searching...</span>
          </span>
        {:else if results?.length === 0}
          <span>
            {@html renderMdAsHtml(emptyStateLabel)}
          </span>
        {/if}
      </div>
    {/if}
  </div>
  {#if !isInlineContext}
    <div
      class={cn("w-full flex items-center px-4 py-1", {
        "justify-between bg-bgs2": bottomMessage,
        "justify-center": !bottomMessage
      })}
    >
      {#if bottomMessage}
        <span class="text-b3 text-fgs3">
          {@html renderMdAsHtml(bottomMessage)}
        </span>
      {/if}
      <Button
        size={Size.xs}
        label="close"
        parentBgIndex={bottomMessage ? 1 : 0}
        on:click={reset}
      />
    </div>
  {/if}
</div>
