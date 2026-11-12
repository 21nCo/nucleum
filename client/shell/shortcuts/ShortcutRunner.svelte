<svelte:options runes={true} />

<script lang="ts">
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
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { resolveSpacePath } from "@nucleum/client/config/space-route";
  import {
    CHORD_TIMEOUT_MS,
    resolveChordSpaceIndex
  } from "@nucleum/shell/shortcuts/chord-keys";

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
    if (pendingPrefix !== undefined) {
      runChord(event);
      return;
    }
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
      if (keyboardShortcuts.isChordPrefix(event)) startChord(event);
      return;
    }
    requireCommandHost().runAction(shortcut.action);
    event.stopPropagation();
    event.preventDefault();
  };

  let pendingPrefix: string | undefined;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;

  function clearChord() {
    pendingPrefix = undefined;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = undefined;
  }

  function startChord(event: KeyboardEvent) {
    clearChord();
    pendingPrefix = event.key.toLowerCase();
    pendingTimer = setTimeout(clearChord, CHORD_TIMEOUT_MS);
    event.preventDefault();
  }

  /**
   * Runs the second key of a chord such as G then C. G then 1 to 9 opens the
   * pinned space in that app menu position. Any other key ends the chord.
   */
  function runChord(event: KeyboardEvent) {
    if (["Shift", "Meta", "Control", "Alt"].includes(event.key)) return;
    const prefix = pendingPrefix;
    clearChord();
    const spaceIndex = resolveChordSpaceIndex(prefix, event);
    if (spaceIndex !== undefined) {
      const spaceId = appMenuStore.pinnedSpaces()[spaceIndex];
      if (spaceId) navigation.gotoPath(resolveSpacePath(spaceId));
      event.preventDefault();
      return;
    }
    const { shortcut } = keyboardShortcuts.resolveShortcut(event, prefix);
    if (!shortcut) return;
    requireCommandHost().runAction(shortcut.action);
    event.stopPropagation();
    event.preventDefault();
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
   * bulk selection, then the resource page. Runs after the event bubbles so
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
