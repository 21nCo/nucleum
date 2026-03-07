<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Size } from "@21n/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { keyboardShortcuts } from "@21n/components/shortcuts/shortcuts.store";
  import type { IKeyboardShortcut } from "@21n/components/shortcuts/shortcut.type";
  import { KeyboardKey, ModifierKey } from "@21n/types/keyboard.type";
  import { OperatingSystem } from "@21n/types/context.type";
  import context from "@21n/stores/context.store";
  import { resolveShortcutText, resolveModifiers } from "@21n/components/shortcuts/shortcut.utils";
  import { tooltip } from "@21n/actions/popover.action";
  const dispatch = createEventDispatcher();
  export let action: string;
  export let shortcut: IKeyboardShortcut;
  let existingValue = resolveShortcutText({
    key: shortcut.key,
    modifiers: shortcut.modifiers,
    os: $context.os
  });
  let isConfigurationInProgress: boolean = false;
  let value: string = existingValue;
  let key: string;
  let modifiers: ModifierKey[] = [];
  let inputRef: HTMLInputElement;
  const actionDetails = appStore.resolveAction(action);
  const systemShortcuts = resolveSystemShortcuts();

  function resolveSystemShortcuts() {
    let primaryModifier = ModifierKey.CTRL;
    if ($context.os === OperatingSystem.MACOS)
      primaryModifier = ModifierKey.META;

    return [
      {
        key: "p",
        modifiers: [primaryModifier]
      },
      {
        key: "c",
        modifiers: [primaryModifier]
      },
      {
        key: "v",
        modifiers: [primaryModifier]
      },
      {
        key: "s",
        modifiers: [primaryModifier]
      },
      {
        key: "z",
        modifiers: [primaryModifier]
      },
      {
        key: "t",
        modifiers: [primaryModifier]
      },
      {
        key: "z",
        modifiers: [primaryModifier, ModifierKey.SHIFT]
      }
    ];
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.key === KeyboardKey.ESCAPE) {
      isConfigurationInProgress = false;
      resetToOldValue(event);
      return;
    } else if (event.key === KeyboardKey.ENTER) {
      accept(event);
      event.stopPropagation();
      event.preventDefault();
      return;
    } else {
      modifiers = [];
      modifiers = resolveModifiers(event);
    }
    if (Object.values(ModifierKey).every((key) => key !== event.key)) {
      key = event.key;
      value = resolveShortcutText({
        key,
        modifiers,
        os: $context.os
      });
      isValidConfiguration();
    }
    event.stopPropagation();
    event.preventDefault();
  }
  function isValidConfiguration() {
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
  function resetToOldValue(event: MouseEvent | KeyboardEvent) {
    isConfigurationInProgress = false;
    value = existingValue;
    if (event instanceof MouseEvent) event.stopPropagation();
  }
  function accept(event: CustomEvent | KeyboardEvent | MouseEvent) {
    if (isValidConfiguration()) {
      isConfigurationInProgress = false;
      saveShortcut();
    }
    if (event instanceof MouseEvent) event.stopPropagation();
  }
</script>

{#if actionDetails}
  <div class="flex items-center justify-between gap-8 w-full">
    <span class="text-b2 whitespace-nowrap">
      {actionDetails?.label}
    </span>
    <button
      class="flex justify-center items-center bg-bgs2 rounded-md p-2 hover:text-aps1 w-60 h-10"
      on:click={() => {
        console.log("clicked");
        if (!isConfigurationInProgress) {
          isConfigurationInProgress = true;
          reset();
          inputRef.focus();
        }
      }}
      use:tooltip={{
        disabled: isConfigurationInProgress,
        text: "Record shortcut"
      }}
    >
      <input
        bind:this={inputRef}
        bind:value
        tabindex="-1"
        id="shortcutInput"
        class="bg-transparent cursor-pointer focus:outline-none w-32 text-fgs2 text-center"
        placeholder="record shortcut"
        type="text"
        on:keydown|stopPropagation={onKeydown}
        on:paste|preventDefault
      />
      {#if isConfigurationInProgress}
        {@const parentBgIndex = 2}
        <div class="flex gap-1">
          <Button
            tooltip="Clear"
            size={Size.sm}
            {parentBgIndex}
            icon="cross"
            on:click={(event) => {
              if (!key) {
                resetToOldValue(event);
                return;
              }
              reset();
              inputRef.focus();
              event.stopPropagation();
            }}
          />
          <span data-testid="shortcut-accept">
            <Button
              tooltip="Accept"
              icon="check-circle"
              size={Size.sm}
              {parentBgIndex}
              on:click={accept}
            />
          </span>
          <Button
            tooltip="Reset to old value"
            icon="reload"
            size={Size.sm}
            {parentBgIndex}
            on:click={resetToOldValue}
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
