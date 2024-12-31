<script lang="ts">
  import { onMount } from "svelte";
  import { ActionType, type IAction } from "$lib/client/types/action.type";
  import SearchActionResults from "./SearchActionResults.svelte";
  import CmdResults from "./CmdResults.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { Action } from "$lib/client/types/action.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Display } from "$lib/client/types/view.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { keyboardShortcuts } from "../shortcuts/shortcuts.store";
  import { renderMdAsHtml } from "../markdown/markdown.utils";
  import { resolveShortcutText } from "../shortcuts/shortcut.utils";
  import { KeyboardKey, ModifierKey } from "$lib/client/types/keyboard.type";
  export let command: string | undefined = undefined;
  export let commandType: ActionType | undefined = undefined;
  export let componentParams: any = undefined;
  export let isFullPageContext: boolean = false;
  let value: string = "";
  let inputRef: HTMLInputElement;
  let resultsRef: any;
  let isPerformingSearchAction: boolean = false;
  let searchAction: IAction;
  let isFocusing: boolean = false;
  let defaultPlaceholder = isFullPageContext
    ? "Search for a command"
    : "Run a command or scroll to see list of all commands";
  let placeholder = defaultPlaceholder;
  onMount(() => {
    inputRef?.focus();
    if (command && commandType && commandType === ActionType.SEARCH_CMD) {
      const action = appStore.resolveAction(command);
      if (!action) return;
      onSearchAction({ detail: action });
    }
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
      if (value == "" && isPerformingSearchAction) {
        isPerformingSearchAction = false;
        placeholder = defaultPlaceholder;
      } else if (value == "") close();
    }
  }
  function onSearchAction(event: any) {
    value = "";
    isPerformingSearchAction = true;
    searchAction = event.detail;
    placeholder =
      typeof searchAction.searchActionParams?.placeholder === "function"
        ? searchAction.searchActionParams.placeholder(componentParams)
        : (searchAction.searchActionParams?.placeholder ?? "select an item");
  }
  function close() {
    value = "";
    modalEvent.hide(Action.CMD);
  }
  /**
   * Used in command-only mode.
   * @param event
   */
  const shortcutListener = (event: KeyboardEvent) => {
    const { shortcut, modifiers } = keyboardShortcuts.resolveShortcut(event);
    if (!shortcut && event?.key === KeyboardKey.ESCAPE && isFocusing) {
      inputRef.blur();
      isFocusing = false;
      return;
    }
    if (
      (shortcut && shortcut.action === Action.CMD) ||
      (!shortcut && modifiers.length === 0 && event.code === KeyboardKey.SPACE)
    ) {
      event.preventDefault();
      if (!isFocusing) inputRef.focus();
      else {
        inputRef.blur();
        isFocusing = false;
      }
    }
  };
</script>

<div
  class={cn("flex flex-col w-full", {
    "border border-brs2 rounded-md": isFullPageContext,
    "h-full": !isFullPageContext || (isFullPageContext && isFocusing)
  })}
>
  <div
    class={cn(
      "flex mo:flex-col w-full bg-bgs2 justify-between items-center mo:rounded-none rounded-t-md"
    )}
  >
    {#if isPerformingSearchAction}
      <div
        class="h-5/6 mo:w-full mo:ml-0 ml-2 bg-bgs3 flex items-center justify-center px-4 mo:rounded-b-md rounded-md"
      >
        {@html renderMdAsHtml(componentParams?.label ?? searchAction.cmdLabel)}
      </div>
    {/if}
    <input
      bind:this={inputRef}
      type="text"
      bind:value
      on:keyup={handleKeyUp}
      on:keydown={handleKeyDown}
      on:focus={() => {
        isFocusing = true;
      }}
      class="h-[3.6rem] mo:h-20 mo:w-full bg-transparent px-4 grow focus:border-none focus:outline-none text-h5"
      {placeholder}
    />
    {#if $view.display !== Display.MO && $context.embed !== Embed.HANDSET}
      <div class="mr-4">
        <div
          class="px-2 flex justify-center items-center gap-2 bg-bgs3 rounded-md py-1 text-b3 text-fgs3 min-w-fit w-fit"
        >
          {#if value}
            Press <b>Enter</b> to run
          {:else if isFullPageContext && !isFocusing}
            Press
            {resolveShortcutText("Space", [], $context.os)} to focus
          {:else if isFullPageContext && isFocusing}
            Press <b>Esc</b> to close
          {:else}
            Cmd bar
          {/if}
        </div>
      </div>
    {/if}
  </div>
  <div class="flex-grow">
    {#if isPerformingSearchAction}
      <!-- {#if value && value !== ""} -->
      <SearchActionResults
        search={value}
        {componentParams}
        bind:this={resultsRef}
        action={searchAction}
        on:close={close}
      />
      <!-- {:else}
        <EmptyStatusView size={Size.sm} subText="start typing to search..." />
      {/if} -->
    {:else if !isFullPageContext || (isFullPageContext && isFocusing)}
      <CmdResults
        search={value}
        bind:this={resultsRef}
        on:searchAction={onSearchAction}
        on:close={close}
      />
    {/if}
  </div>
  {#if $view.display === Display.MO || $context.embed === Embed.HANDSET}
    <div class="flex w-full justify-center py-2 pb-8">
      <Button label="Close" style={ButtonStyle.PLAIN} on:click={close} />
    </div>
  {:else if !isFullPageContext}
    <div
      class={cn(
        "flex w-full h-8 min-h-[2rem] bg-bgs2 justify-between items-center text-b3 text-fgs3 px-4 rounded-b-md"
      )}
    >
      <span> Press <b>Esc</b> to close </span>
      <ShortcutText shortcut={Action.CMD} parentBgIndex={1} />
    </div>
  {/if}
</div>
<svelte:window on:keydown={shortcutListener} />
