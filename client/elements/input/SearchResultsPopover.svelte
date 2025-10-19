<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import SearchResultItem from "@21n/elements/input/SearchResultItem.svelte";
  import { debouncer } from "@21n/utils/utils";
  import { cn } from "@21n/utils/ui.utils";
  import type { IResource } from "@21n/components/flux/resourceStores/resource.type";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import { logger } from "@21n/components/debug/logger.client";
  import Icon from "@21n/elements/Icon.svelte";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import { appStore } from "@21n/stores/app.store";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import { KeyboardKey, ModifierKey } from "@21n/types/keyboard.type";
  export let searchCallback: Function | undefined = undefined;
  export let searchResultComponent: any = undefined;
  export let searchResultComponentProps: Record<string, unknown> = {};
  /**
   * @deprecated use shortcutTriggers instead
   */
  export let shortcutTrigger: string | undefined = undefined;
  export let shortcutTriggers: string[] = [];
  export let emptyStateLabel: string | { mainText?: string; subText?: string } =
    "No results found";
  export let isPreventDefaultResults: boolean = false;
  export let isInlineContext: boolean = false;
  export let isAlwaysShowSearchFeedback: boolean = false;
  export let bottomMessage: string | undefined = undefined;
  export let onSelect: Function | undefined = undefined;
  export let onReset: Function | undefined = undefined;
  export let isApplyPopoverStyling: boolean = false;
  export let id: string = generateSimpleRandomId();
  export let isPreventAutoSelectZeroIndex: boolean = false;

  let value: string;
  type SearchItem = Partial<IResource & Record<string, unknown>>;
  let results: SearchItem[] = [];
  let selectedIndex: number = resolveDefaultIndexSelection();
  let previousValue: string = "";
  let currentValue: string;
  let isSearchInProgress: boolean = !isPreventDefaultResults;

  export function reset() {
    resetSearch();
    value = "";
    dispatch("reset");
    if (onReset) onReset();
  }

  export function resetSelectedIndex() {
    selectedIndex = resolveDefaultIndexSelection();
  }

  function resolveDefaultIndexSelection() {
    return isPreventAutoSelectZeroIndex ? -1 : 0;
  }

  const dispatch = createEventDispatcher();

  function onSearchResultSelection(item: SearchItem, e?: MouseEvent) {
    dispatch("select", { item, event: e });
    if (onSelect) onSelect({ detail: { item, event: e } });
    if (item?.id) {
      const type = determineResourceType(item.id);
      appStore.addToRecents({
        record: {
          ...item,
          bodySearch: undefined,
          labelSearch: undefined
        },
        type,
        timestamp: new Date()
      });
    }
    hide();
  }
  function resetSearch() {
    results = [];
    selectedIndex = resolveDefaultIndexSelection();
    hide();
  }

  export function keydown(event: any) {
    logger.log({ at: "SearchResultsPopover - keydown", event });
    if (event.key === KeyboardKey.ARROW_DOWN) {
      selectedIndex = Math.min(selectedIndex + 1);
      if (selectedIndex === results?.length) {
        selectedIndex = 0;
      }
      event.preventDefault();
    } else if (event.key === KeyboardKey.ARROW_UP) {
      selectedIndex = Math.max(selectedIndex - 1, -1);
      if (selectedIndex === -1) {
        selectedIndex = results?.length;
      }
      event.preventDefault();
    }
  }

  const modifierKeys = [
    ModifierKey.META,
    ModifierKey.CTRL,
    ModifierKey.ALT,
    ModifierKey.SHIFT
  ];
  export function keyup(event: any) {
    if (modifierKeys.includes(event.key as ModifierKey)) return;
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
    if (event.key === KeyboardKey.ESCAPE) {
      resetSearch();
      // inputRef.blur();
      dispatch("blur");
    } else if (event.key === KeyboardKey.BACKSPACE) {
      previousValue = currentValue;
      currentValue = value;
      if (previousValue?.length > currentValue?.length) {
        const deletedChar = previousValue.charAt(previousValue.length - 1);
        if (deletedChar === "#") {
          //
        }
      }
      debouncedSearch();
    } else if (event.key === KeyboardKey.ENTER) {
      if (results && results.length > 0) {
        onSearchResultSelection(results[selectedIndex]);
      } else {
        //save();
        dispatch("empty-enter", { event, value });
      }
    } else if (
      event.key !== KeyboardKey.ARROW_DOWN &&
      event.key !== KeyboardKey.ARROW_UP
    ) {
      currentValue = value;
      debouncedSearch();
    }
    // dispatch("keyup", { value, event });
  }

  let debouncedSearch = debouncer(search, 500);

  export async function search(newValue?: string) {
    const val = newValue ?? value;
    isSearchInProgress = true;
    selectedIndex = resolveDefaultIndexSelection();
    results = [];
    if (!val && isPreventDefaultResults) {
      results = [];
      hide();
      isSearchInProgress = false;
      return;
    }
    if (searchCallback) {
      let result = await searchCallback(val);
      if (result) results = result;
      isSearchInProgress = false;
      if (results.length > 0) {
        show();
      }
      dispatch("count", { count: results?.length });
      return;
    }

    isSearchInProgress = false;
    if (results?.length > 0) {
      show();
    }
    dispatch("count", { count: results?.length });
  }

  function show() {
    dispatch("show");
  }

  function hide() {
    dispatch("hide");
  }
</script>

<div
  {id}
  class={cn("flex flex-col justify-between w-full", {
    "max-h-72 h-72": !isInlineContext,
    "h-full": isInlineContext,
    "bg-bgs1 rounded-md border border-brs2": isApplyPopoverStyling
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
          {#if typeof emptyStateLabel === "string"}
            <span>
              {@html renderMdAsHtml(emptyStateLabel)}
            </span>
          {:else if emptyStateLabel.mainText && emptyStateLabel.subText}
            <div class="flex flex-col gap-2 text-center">
              <span class="text-b2 font-medium">
                {@html renderMdAsHtml(emptyStateLabel.mainText)}
              </span>
              <span>
                {@html renderMdAsHtml(emptyStateLabel.subText)}
              </span>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
  {#if !isInlineContext}
    <div
      class={cn("w-full flex items-center gap-6 cw:px-2 px-4 cw:py-2 py-1", {
        "justify-between bg-bgs2": bottomMessage,
        "justify-center": !bottomMessage
      })}
    >
      {#if bottomMessage}
        <span class="text-b3 text-fgs3 text-left">
          {@html renderMdAsHtml(bottomMessage)}
        </span>
      {/if}
      <button
        class="flex items-center gap-1 active:bg-bgs2 notouch:hover:bg-bgs2 px-1 rounded-md"
        on:click={reset}
      >
        <Icon icon="cross" size={Size.sm} class="text-fgs3" />
        <span class="text-fgs3 text-b2">Close</span>
      </button>
    </div>
  {/if}
</div>

<svelte:window
  on:searchresultkeyup={(e) => {
    if (id !== e.detail.id || !e.detail.event) return;
    keyup(e.detail.event);
  }}
  on:searchresultkeydown={(e) => {
    if (id !== e.detail.id || !e.detail.event) return;
    keydown(e.detail.event);
  }}
/>
