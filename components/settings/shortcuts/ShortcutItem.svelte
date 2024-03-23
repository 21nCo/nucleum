<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import type { KeyboardShortcut } from "$lib/tidy/types/preferences.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { resolveComponent } from "$lib/tidy/utils/utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let shortcut: KeyboardShortcut;
  let existingValue =
    shortcut.modifiers.join(" + ") + " + " + shortcut.key.toUpperCase();
  let isConfigurationInProgress: boolean = false;
  let value: string = existingValue;
  let key: string;
  let modifiers: string[] = [];
  let inputRef: HTMLInputElement;
  const action = resolveComponent(shortcut.action);
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
  function saveShortcut() {
    if ($userPreferences.shortcuts) {
      const index = $userPreferences.shortcuts.findIndex(
        (x) => x.action === shortcut.action
      );
      if (index > -1) {
        $userPreferences.shortcuts[index] = {
          action: shortcut.action,
          modifiers,
          key
        };
      } else {
        $userPreferences.shortcuts.push({
          action: shortcut.action,
          modifiers,
          key
        });
      }
    } else {
      $userPreferences.shortcuts = [
        {
          action: shortcut.action,
          modifiers,
          key
        }
      ];
    }
    existingValue = value;
  }
  function reset() {
    value = "";
    key = "";
    modifiers = [];
  }
</script>

{#if action}
  <div class="flex items-center justify-between gap-8">
    <span>
      {action?.label}
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
