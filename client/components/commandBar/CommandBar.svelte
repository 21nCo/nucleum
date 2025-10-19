<script lang="ts">
  import { onMount } from "svelte";
  import { ActionType, type IAction } from "@21n/types/action.type";
  import SearchActionResults from "@21n/components/commandBar/SearchActionResults.svelte";
  import CmdResults from "@21n/components/commandBar/CmdResults.svelte";
  import { Size } from "@21n/types/size.enum";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import modalEvent from "@21n/components/modal/modal.store";
  import { Action } from "@21n/types/action.enum";
  import { cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import { appStore } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import { Display } from "@21n/types/view.type";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import ShortcutText from "@21n/elements/text/ShortcutText.svelte";
  import context from "@21n/stores/context.store";
  import { Embed } from "@21n/types/context.type";
  import { keyboardShortcuts } from "@21n/components/shortcuts/shortcuts.store";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import { resolveShortcutText } from "@21n/components/shortcuts/shortcut.utils";
  import { KeyboardKey, ModifierKey } from "@21n/types/keyboard.type";
  import KeyboardToolbar from "@21n/elements/keyboardToolbar/KeyboardToolbar.svelte";
  import { fly } from "svelte/transition";
  import { quadInOut } from "svelte/easing";

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
    : "Search for a command or scroll to see full list";
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
    if (event.key === "Backspace" && !$view.isConstrainedWidth) {
      if (value == "" && isPerformingSearchAction) {
        resetContext();
      } else if (value == "") close();
    }
  }

  function resetContext() {
    isPerformingSearchAction = false;
    placeholder = defaultPlaceholder;
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
  class={cn(
    "flex flex-col cw:w-full cw:min-w-full w-[40rem] max-w-full overflow-auto",
    {
      "border border-brs2 rounded-md": isFullPageContext,
      "cw:h-full h-[30rem]":
        !isFullPageContext || (isFullPageContext && isFocusing)
    }
  )}
>
  {#if isPerformingSearchAction}
    <div
      class="h-fit min-h-fit flex gap-2 justify-between items-center cw:w-full cw:max-w-full w-fit max-w-60 cw:ml-0 ml-2 mt-2 bg-bgs2 cw:px-3 cw:py-2 pr-1 pl-3 cw:rounded-none rounded-md truncate"
      in:fly={{ y: -10, easing: quadInOut, duration: 250 }}
    >
      <span class="truncate">
        {@html renderMdAsHtml(componentParams?.label ?? searchAction.cmdLabel)}
      </span>
      {#if $view.isConstrainedWidth}
        <Button icon="cross" tooltip="Close" on:click={close} />
      {:else}
        <Button
          icon="backspace"
          tooltip="Clear"
          on:click={() => {
            value = "";
            resetContext();
          }}
        />
      {/if}
    </div>
  {/if}
  <div
    class={cn(
      "flex mo:flex-col w-full bg-bgs1 justify-between items-center mo:rounded-none rounded-t-md"
    )}
  >
    <input
      bind:this={inputRef}
      type="text"
      bind:value
      on:keyup={handleKeyUp}
      on:keydown={handleKeyDown}
      on:focus={() => {
        isFocusing = true;
      }}
      class="h-[3.6rem] mo:h-20 mo:w-full bg-transparent px-4 grow focus:border-none focus:outline-none text-h5 transition-all duration-300"
      {placeholder}
    />
    {#if !$view.isConstrainedWidth && $context.embed !== Embed.HANDSET}
      <div class="mr-4">
        <div
          class={cn(
            "px-2 flex justify-center items-center gap-2 rounded-md py-1 text-b3 text-fgs3 min-w-fit w-fit",
            {
              "bg-bgs2": !(isFullPageContext && !isFocusing)
            }
          )}
        >
          {#if value}
            Press <b>Enter</b> to run
          {:else if isFullPageContext && !isFocusing}
            <!-- {resolveShortcutText({
              key: "Space",
              os: $context.os
            })} -->
            <ShortcutText
              shortcut={Action.CMD}
              parentBgIndex={1}
              isAlwaysShown={true}
            />
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
      <span class="inline-flex items-center gap-1">
        Press
        <ShortcutText
          shortcut={Action.CLOSE}
          parentBgIndex={2}
          isAlwaysShown={true}
        />
        to close
      </span>
      <ShortcutText
        shortcut={Action.CMD}
        parentBgIndex={2}
        isAlwaysShown={true}
      />
    </div>
  {/if}
</div>

<KeyboardToolbar class="bg-bgs2 h-14 px-4 flex items-center justify-between">
  <div class="flex items-center justify-center gap-2">
    <!-- left actions -->
  </div>
  <div class="flex items-center justify-center gap-2">
    <Button
      icon="cross"
      label="clear"
      parentBgIndex={2}
      size={Size.sm}
      style={ButtonStyle.DEFAULT}
      isPreventMinWidth={true}
      on:click={() => {
        value = "";
      }}
      on:mousedown={(e) => e.preventDefault()}
    />
    <Button
      icon="ph:caret-line-down-light"
      label="cancel"
      parentBgIndex={2}
      size={Size.sm}
      style={ButtonStyle.DEFAULT}
      isPreventMinWidth={true}
      on:click={close}
    />
  </div>
</KeyboardToolbar>

<svelte:window on:keydown={shortcutListener} />
