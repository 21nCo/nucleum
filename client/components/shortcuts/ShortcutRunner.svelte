<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { isTextElement } from "$lib/client/utils/browser.utils";
  import { keyboardShortcuts } from "./shortcuts.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { KeyboardKey } from "$lib/client/types/keyboard.type";
  import { resolveModifiers } from "./shortcut.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { Action } from "$lib/client/types/action.enum";
  import { InteractionMode } from "../settings/interactionMode/interactionMode.type";

  function handleSystemShortcuts(event: KeyboardEvent) {
    logger.log({ at: "handleSystemShortcuts", key: event.key });
    if (event.key === KeyboardKey.ESCAPE || event.key === KeyboardKey.ENTER) {
      appEvents.publish(event.key.toString() as GlobalEvent);
      return true;
    }
  }
  /**
   * Listens to keyboard events and runs the shortcut if the event is a shortcut.
   *
   * Avoids running the shortcut if the event is a text input element and the key is `Enter`. This is to avoid running the shortcut when the user is typing in a text field with suggestions.
   * @param event
   */
  const shortcutListener = (event: KeyboardEvent) => {
    logger.log({ event, at: "shortcutListener" });
    const target = event.target || event.srcElement;
    const isTextInputSource = isTextElement(target);
    const { shortcut, modifiers } = keyboardShortcuts.resolveShortcut(event);
    if (
      isTextInputSource &&
      (event.key === KeyboardKey.ENTER ||
        (modifiers.length === 0 &&
          ![KeyboardKey.ESCAPE].includes(event.key as KeyboardKey)))
    )
      return;
    const isSystemShortcut = handleSystemShortcuts(event);
    if (isSystemShortcut || !shortcut) return;
    const interactionMode = uiState.getState(Action.MODE_OF_INTERACTION, {
      isProductScoped: true
    });
    if (
      interactionMode === InteractionMode.COMMAND_ONLY &&
      shortcut.action === Action.CMD
    )
      return;
    appStore.runAction(shortcut.action);
    event.stopPropagation();
    event.preventDefault();
  };
</script>

<svelte:window on:keydown={shortcutListener} />
