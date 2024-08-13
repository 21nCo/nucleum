<script lang="ts">
  import { InputStyle } from "$lib/client/types/input.type";
  import TextInput from "./input/TextInput.svelte";
  import Button from "./button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import { uiStateDerived } from "../stores/uiState/uiState.store";
  import ShortcutText from "./text/ShortcutText.svelte";
  import { GlobalEvent } from "../types/event.enum";
  import { appEvents } from "../stores/notification.store";
  import type { IEvent } from "../types/event.type";
  import { cn } from "../utils/ui.utils";
  export let query: string = "";
  export let size: Size = Size.md;
  export let placeholder: string = "Search";
  export let parentBgIndex: number = 0;
  export let isPadded: boolean = false;
  const dispatch = createEventDispatcher();
  let searchInputRef: any;
  let isSearchFocused: boolean = false;
  onMount(() => {
    const appEventSub = appEvents.subscribe((x: IEvent) => {
      console.log({ x });
      if (x.event === GlobalEvent.ACTIVATE_SEARCH_BOX) {
        searchInputRef?.focus();
      }
    });
    return () => {
      appEventSub();
    };
  });
</script>

<div
  class={cn("flex items-center min-h-12 w-full gap-2 border-b", {
    "py-1.5": size === Size.sm,
    "py-2": size === Size.md,
    "py-4": size === Size.lg,
    "px-2": isPadded,
    "border-fgs3 border-opacity-80": isSearchFocused,
    "border-brs2": !isSearchFocused
  })}
>
  <TextInput
    bind:this={searchInputRef}
    bind:value={query}
    {size}
    {placeholder}
    style={InputStyle.PLAIN}
    on:keydown
    on:focus={() => (isSearchFocused = true)}
    on:blur={() => (isSearchFocused = false)}
    on:change={() => dispatch("search")}
  />
  {#if query}
    <Button
      icon="cross"
      tooltip="Clear query"
      size={Size.sm}
      on:click={() => {
        query = "";
        dispatch("search");
      }}
    />
  {:else if $uiStateDerived.isShowHotKeyHints}
    <span>
      <ShortcutText
        shortcut={GlobalEvent.ACTIVATE_SEARCH_BOX}
        {parentBgIndex}
      />
    </span>
  {/if}
</div>
