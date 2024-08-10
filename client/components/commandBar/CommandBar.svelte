<script lang="ts">
  import { onMount } from "svelte";
  import type { IAction } from "$lib/client/types/action.type";
  import SearchActionResults from "./SearchActionResults.svelte";
  import CmdResults from "./CmdResults.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { Action } from "$lib/client/types/action.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  export let isFullPageContext: boolean = false;
  let value: string = "";
  let inputRef: HTMLInputElement;
  let resultsRef: any;
  let isPerformingSearchAction: boolean = false;
  let searchAction: IAction;
  let defaultPlaceholder = isFullPageContext
    ? "Search for a command or use arrow keys to navigate"
    : "Run a command or scroll to see list of all commands";
  let placeholder = defaultPlaceholder;
  onMount(() => {
    inputRef?.focus();
  });
  function handleKeyUp(event: any) {
    if (event.key === "ArrowDown") {
      resultsRef.moveSelection("down");
    } else if (event.key === "ArrowUp") {
      resultsRef.moveSelection("up");
    } else if (event.key === "Enter") {
      resultsRef.select();
    }
  }
  function handleKeyDown(event: any) {
    if (event.key === "Backspace") {
      if (value == "" && isPerformingSearchAction)
        isPerformingSearchAction = false;
      else if (value == "") close();
    }
  }
  function onSearchAction(event: any) {
    value = "";
    isPerformingSearchAction = true;
    searchAction = event.detail;
    placeholder = "select a " + searchAction.searchActionParams?.itemLabel;
  }
  function close() {
    modalEvent.hideSpecific(Action.CMD);
  }
  const shortcutListener = (event: KeyboardEvent) => {
    console.log({ event });
    if (event.key === "Meta") {
      inputRef.focus();
    }
  };
</script>

<div
  class={cn("flex flex-col h-full w-full", {
    "border border-brs2 rounded-md": isFullPageContext
  })}
>
  <div
    class={cn("flex w-full bg-bgs2 justify-between items-center", {
      "rounded-t-md": isFullPageContext
    })}
  >
    {#if isPerformingSearchAction}
      <div
        class="h-5/6 ml-2 bg-bgs3 flex items-center justify-center px-4 rounded-md"
      >
        {searchAction.cmdLabel}
      </div>
    {/if}
    <input
      bind:this={inputRef}
      type="text"
      bind:value
      on:keyup={handleKeyUp}
      on:keydown={handleKeyDown}
      class="h-[3.6rem] bg-transparent px-4 grow focus:border-none focus:outline-none text-h5"
      {placeholder}
    />
    <div class="mr-4">
      <div
        class="px-2 flex justify-center items-center gap-2 bg-bgs3 rounded-md py-1 text-b3 text-fgs3 min-w-fit w-fit"
      >
        {#if value}
          Press <b>Enter</b> to run
        {:else if isFullPageContext}
          <Icon icon="command" size={Size.sm} />
          <span> Cmd </span>
        {:else}
          Cmd bar
        {/if}
      </div>
    </div>
  </div>
  <div class="flex-grow">
    {#if isPerformingSearchAction}
      {#if value}
        <SearchActionResults
          search={value}
          bind:this={resultsRef}
          action={searchAction}
          on:close={close}
        />
      {:else}
        <EmptyStatusView size={Size.sm} subText="start typing to search..." />
      {/if}
    {:else}
      <CmdResults
        search={value}
        bind:this={resultsRef}
        on:searchAction={onSearchAction}
        on:close={close}
      />
    {/if}
  </div>
  {#if !isFullPageContext}
    <div
      class={cn(
        "flex w-full h-8 min-h-[2rem] bg-bgs2 justify-between items-center text-b3 text-fgs3 px-4"
      )}
    >
      <span> Press <b>Esc</b> to close </span>
      <span> Cmd + K </span>
    </div>
  {/if}
</div>
<svelte:window on:keydown={shortcutListener} />
