<svelte:options runes={true} />

<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import {
    isTextElement,
    resolveDialogOnFront,
    resolveModalOnFront
  } from "@21n/ui/actions/interaction-dom";
  import { closeTopLayer } from "@nucleum/shell/navigation/top-layer";
  import { bulkEditStore } from "@nucleum/shared-state/resources/bulkedit.store";
  import { get } from "svelte/store";
  import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
  import { appEvents } from "@nucleum/shared-state/events/app-events.store";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import { KeyboardKey } from "@21n/ui/elements/keyboard/keyboard.type";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { Action } from "@nucleum/client/config/action.enum";
  import { InteractionMode } from "@21n/ui/elements/keyboard/interaction-mode.type";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import { UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
  import { resolveContextViewIndex } from "@nucleum/shell/shortcuts/context-view-keys";

  function checkIfSystemShortcut(event: KeyboardEvent) {
    return (
      (event.key === KeyboardKey.ESCAPE && event.metaKey === true) ||
      (event.key === KeyboardKey.ENTER && event.metaKey === true)
    );
  }

  /**
   * Listens to keyboard events and runs the shortcut if the event is a shortcut.
   *
   * Avoids running the shortcut if the event is a text input element and the key is `Enter`. This is to avoid running the shortcut when the user is typing in a text field with suggestions.
   *
   * Pressing `Escape` when text element is required in cases like command bar modal, search modal etc. If this is causing issue, kindly stop propagation on keyDown event from the source if its Esc key.
   *
   * @param event
   */
  const shortcutListener = (event: KeyboardEvent) => {
    if ($context.embed === Embed.HANDSET) return;
    const target = event.target || event.srcElement;
    const isTextInputSource = isTextElement(target);
    const isSystemShortcut = checkIfSystemShortcut(event);
    if (isSystemShortcut) {
      appEvents.publish(event.key.toString() as GlobalEvent, event);
      return;
    }
    if (isTextInputSource && event.metaKey === false) return;
    const { shortcut, modifiers } = keyboardShortcuts.resolveShortcut(event);
    logger.log({
      at: "shortcutListener",
      isTextInputSource,
      isSystemShortcut,
      shortcut,
      modifiers,
      target,
      event
    });
    if (!shortcut) {
      selectContextViewByNumber(event);
      return;
    }
    const interactionMode = uiState.getState(Action.MODE_OF_INTERACTION, {
      scope: UIStateScope.PRODUCT
    });
    if (
      interactionMode === InteractionMode.AGENT &&
      shortcut.action === Action.CMD
    ) {
      navigation.toggleSearchParam([AppSearchParam.TAB]);
      event.preventDefault();
      return;
    }
    requireCommandHost().runAction(shortcut.action);
    event.stopPropagation();
    event.preventDefault();
  };

  /**
   * Selects the top bar view numbered by a plain 1 to 9 key, unless a modal,
   * dialog or popover is in front.
   */
  function selectContextViewByNumber(event: KeyboardEvent) {
    const index = resolveContextViewIndex(event);
    if (index === undefined) return;
    if (resolveModalOnFront() || resolveDialogOnFront() || hasOpenPopover())
      return;
    if (contextZone.selectAt(index)) event.preventDefault();
  }

  function hasOpenPopover() {
    return Array.from(document.querySelectorAll(".popover")).some(
      (element) =>
        !element.classList.contains("pointer-events-none") &&
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== "hidden"
    );
  }

  function isFormField(target: EventTarget | null) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    );
  }

  let escapeBulkCount: number | undefined;

  const escapeCaptureListener = (event: KeyboardEvent) => {
    if (event.key !== KeyboardKey.ESCAPE) return;
    escapeBulkCount = get(bulkEditStore.count);
  };

  /**
   * Closes the top layer on a plain Escape: overlay, then right panel, then
   * bulk selection, then the resource page. While a text editor has focus,
   * Escape only releases that focus, so keyboard shortcuts work next. Runs after the event bubbles so
   * editors, modals, dialogs and popovers that handle Escape stop it first;
   * the selection size is read in the capture phase, before selection
   * handlers clear it.
   */
  const escapeListener = (event: KeyboardEvent) => {
    if (event.key !== KeyboardKey.ESCAPE) return;
    const bulkCount = escapeBulkCount;
    escapeBulkCount = undefined;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
      return;
    if ($context.embed === Embed.HANDSET || event.defaultPrevented) return;
    if (event.target instanceof HTMLElement && event.target.isContentEditable) {
      event.target.blur();
      return;
    }
    if (isFormField(event.target)) return;
    if (resolveModalOnFront() || resolveDialogOnFront() || hasOpenPopover())
      return;
    closeTopLayer({ bulkCount });
  };
</script>

<svelte:window
  onkeydown={(event) => {
    shortcutListener(event);
    escapeListener(event);
  }}
  onkeydowncapture={escapeCaptureListener}
/>
