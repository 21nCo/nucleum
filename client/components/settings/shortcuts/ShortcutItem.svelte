<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { keyboardShortcuts } from "../../shortcuts/shortcuts.store";
  import type { IKeyboardShortcut } from "../../shortcuts/shortcut.type";
  const dispatch = createEventDispatcher();
  export let action: string;
  export let shortcut: IKeyboardShortcut;
  let existingValue =
    shortcut.modifiers?.join(" + ") + " + " + shortcut.key?.toUpperCase();
  let isConfigurationInProgress: boolean = false;
  let value: string = existingValue;
  let key: string;
  let modifiers: string[] = [];
  let inputRef: HTMLInputElement;
  const actionDetails = appStore.resolveAction(action);
  const systemShortcuts = [
    {
      key: "p",
      modifiers: ["Ctrl"]
    },
    {
      key: "c",
      modifiers: ["Ctrl"]
    },
    {
      key: "v",
      modifiers: ["Ctrl"]
    },
    {
      key: "s",
      modifiers: ["Ctrl"]
    },
    {
      key: "z",
      modifiers: ["Ctrl"]
    },
    {
      key: "t",
      modifiers: ["Ctrl"]
    },
    {
      key: "z",
      modifiers: ["Ctrl", "Shift"]
    }
  ];
  function onKeydown(event: any) {
    modifiers = [];
    if (event.key === "Escape") {
      isConfigurationInProgress = false;
      return;
    } else {
      if (event.metaKey || event.ctrlKey) {
        modifiers.push("Ctrl");
      }
      if (event.altKey) {
        modifiers.push("Alt");
      }
      if (event.shiftKey) {
        modifiers.push("Shift");
      }
    }
    if (!["Meta", "Shift", "Control", "Alt"].some((x) => x === event.key)) {
      key = event.key;
      value = modifiers.join(" + ") + " + " + key.toUpperCase();
      isValidConfiguration();
    }
    event.stopPropagation();
    event.preventDefault();
  }
  function isValidConfiguration() {
    console.log({ key, modifiers });
    if (!key || !modifiers) {
      dispatch("error", "Invalid shortcut");
      return false;
    }
    if (
      systemShortcuts.some(
        (x) =>
          x.key === key &&
          x.modifiers.length === modifiers.length &&
          x.modifiers.every((y) => modifiers.includes(y))
      )
    ) {
      dispatch(
        "error",
        "This is a system shortcut. Please use some other shortcut."
      );
      return false;
    }
    return true;
  }
  async function saveShortcut() {
    await keyboardShortcuts.saveShortcut(action, {
      key,
      modifiers
    });
    existingValue = value;
  }
  function reset() {
    value = "";
    key = "";
    modifiers = [];
  }
</script>

{#if actionDetails}
  <div class="flex items-center justify-between gap-8">
    <span>
      {actionDetails?.label}
    </span>
    <button
      class="flex justify-center items-center bg-bgs2 rounded-md p-2 hover:text-aps1 w-60"
      on:click={() => {
        if (!isConfigurationInProgress) {
          isConfigurationInProgress = true;
          reset();
          inputRef.focus();
        }
      }}
    >
      <input
        bind:this={inputRef}
        bind:value
        id="shortcutInput"
        class="bg-transparent cursor-pointer focus:outline-none w-32 text-fgs2"
        placeholder="record shortcut"
        type="text"
        on:keydown|stopPropagation={onKeydown}
        on:paste|preventDefault
      />
      {#if isConfigurationInProgress}
        <div class="flex gap-1">
          <Button
            tooltip="clear"
            size={Size.xs}
            icon="cross"
            on:click={(event) => {
              reset();
              inputRef.focus();
              event.stopPropagation();
            }}
          />
          <Button
            tooltip="reset to old value"
            icon="sync"
            size={Size.xs}
            on:click={(event) => {
              isConfigurationInProgress = false;
              value = existingValue;
              event.stopPropagation();
            }}
          />
          <Button
            tooltip="accept"
            icon="check-circle"
            size={Size.xs}
            on:click={(event) => {
              if (isValidConfiguration()) {
                isConfigurationInProgress = false;
                saveShortcut();
              }
              event.stopPropagation();
            }}
          />
        </div>
      {/if}
    </button>
  </div>
{/if}

<style>
  #shortcutInput {
    caret-color: transparent;
  }
</style>
