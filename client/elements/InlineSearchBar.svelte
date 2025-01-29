<script lang="ts">
  import { InputStyle } from "$lib/client/types/input.type";
  import TextInput from "./input/TextInput.svelte";
  import Button from "./button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher, onMount, tick } from "svelte";
  import { uiStateDerived } from "../stores/uiState/uiState.store";
  import ShortcutText from "./text/ShortcutText.svelte";
  import { GlobalEvent } from "../types/event.enum";
  import { appEvents } from "../stores/notification.store";
  import type { IEvent } from "../types/event.type";
  import { cn } from "../utils/ui.utils";
  import { debouncer } from "../utils/utils";
  export let query: string = "";
  export let size: Size = Size.md;
  export let placeholder: string = "Search";
  export let parentBgIndex: number = 0;
  export let style: InputStyle = InputStyle.PLAIN;
  export let isPadded: boolean = false;
  export let padding: string = "";
  const dispatch = createEventDispatcher();
  let searchInputRef: any;
  let isSearchFocused: boolean = false;

  onMount(() => {
    const appEventSub = appEvents.subscribe((x: IEvent) => {
      if (x.event === GlobalEvent.ACTIVATE_SEARCH_BOX) {
        requestAnimationFrame(() => {
          searchInputRef?.focus();
        });
      }
    });
    return () => {
      appEventSub();
    };
  });

  export async function focus() {
    await tick();
    searchInputRef?.focus();
  }

  export function blur() {
    searchInputRef?.blur();
  }

  function propagate() {
    dispatch("search");
  }

  const debouncedSearch = debouncer(propagate, 500);
</script>

<div
  class={cn("flex items-center w-full gap-2", padding, {
    "border-b": style === InputStyle.PLAIN,
    "h-10": size === Size.sm,
    "min-h-12": size === Size.md,
    "min-h-14": size === Size.lg,
    "px-3": isPadded && !padding,
    "border-fgs3 border-opacity-80": isSearchFocused,
    "border-brs2": !isSearchFocused
  })}
>
  <TextInput
    bind:this={searchInputRef}
    bind:value={query}
    {size}
    {placeholder}
    {style}
    isRounded={true}
    height="h-10"
    icon={style === InputStyle.PLAIN ? undefined : "ph:magnifying-glass-light"}
    isShowClearControl={query !== ""}
    on:focus={() => {
      isSearchFocused = true;
      dispatch("focus");
    }}
    on:blur={() => (isSearchFocused = false)}
    on:cancel={() => {
      query = "";
      dispatch("search");
    }}
    on:change={debouncedSearch}
  />
  <slot>
    {#if $uiStateDerived.isShowHotKeyHints}
      <span>
        <ShortcutText
          shortcut={GlobalEvent.ACTIVATE_SEARCH_BOX}
          {parentBgIndex}
        />
      </span>
    {/if}
  </slot>
</div>
