<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import {
    isRightDrawerOnFront,
    isTextElement
  } from "@21n/ui/actions/interaction-dom";
  import {
    isLayerOnFront,
    isViewKeyLayerOnFront
  } from "@nucleum/shell/shortcuts/front-layer";
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
  import { Action } from "@nucleum/client/config/action.enum";
  import { resolveContextViewIndex } from "@nucleum/shell/shortcuts/context-view-keys";
  import {
    selectContextViewAt,
    stepContextView
  } from "@nucleum/shell/shortcuts/context-view-step";
  import { stepListItem } from "@nucleum/shell/shortcuts/list-item-step";
  import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";

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
   * While a right-side drawer is on front only `Escape` passes, so shortcuts do not act on the app behind it.
   *
   * @param event
   */
  const shortcutListener = (event: KeyboardEvent) => {
    if ($context.embed === Embed.HANDSET) return;
    if (event.key !== KeyboardKey.ESCAPE && isRightDrawerOnFront()) return;
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
    const viewStep = CONTEXT_VIEW_STEPS[shortcut.action];
    if (viewStep !== undefined) {
      stepContextViewByKey(event, viewStep);
      return;
    }
    const subViewStep = SUB_VIEW_STEPS[shortcut.action];
    if (subViewStep !== undefined) {
      stepSubViewByKey(event, subViewStep);
      return;
    }
    const listStep = LIST_ITEM_STEPS[shortcut.action];
    if (listStep !== undefined) {
      stepListItemByKey(event, listStep);
      return;
    }
    requireCommandHost().runAction(shortcut.action);
    event.stopPropagation();
    event.preventDefault();
  };

  const CONTEXT_VIEW_STEPS: Partial<Record<string, number>> = {
    [Action.PREVIOUS_CONTEXT_VIEW]: -1,
    [Action.NEXT_CONTEXT_VIEW]: 1
  };

  /**
   * Steps the shown page's views for Option+Left / Option+Right. Skips a key
   * another handler already consumed (such as a Space nav tree move), and
   * keeps the browser default (Alt+Left/Right history on Windows and Linux)
   * unless a view was selected.
   */
  function stepContextViewByKey(event: KeyboardEvent, delta: number) {
    if (event.defaultPrevented) return;
    if (!stepContextView(delta)) return;
    event.stopPropagation();
    event.preventDefault();
  }

  const SUB_VIEW_STEPS: Partial<Record<string, number>> = {
    [Action.PREVIOUS_SUB_VIEW]: -1,
    [Action.NEXT_SUB_VIEW]: 1
  };

  /**
   * Steps the shown page's in-page sub switcher for Option+Shift+Left /
   * Option+Shift+Right with the same guards as the view keys: skips a key
   * another handler already consumed and a modal, dialog, popover or
   * `aria-modal` layer in front, and keeps the browser default unless a view
   * was selected.
   */
  function stepSubViewByKey(event: KeyboardEvent, delta: number) {
    if (event.defaultPrevented) return;
    if (isViewKeyLayerOnFront()) return;
    if (!contextZone.stepSub(delta)) return;
    event.stopPropagation();
    event.preventDefault();
  }

  const LIST_ITEM_STEPS: Partial<Record<string, number>> = {
    [Action.PREVIOUS_LIST_ITEM]: -1,
    [Action.NEXT_LIST_ITEM]: 1
  };

  /**
   * Steps the vertical list of the page in front for Option+Up / Option+Down.
   * Skips a key another handler already consumed (such as a Space nav row
   * move), and keeps the browser default (Option+Up/Down scrolls a page on
   * macOS) unless an item was selected.
   */
  function stepListItemByKey(event: KeyboardEvent, delta: number) {
    if (event.defaultPrevented) return;
    if (!stepListItem(delta)) return;
    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * Selects the shown page's view numbered by a plain 1 to 9 key, unless
   * another handler consumed the key or a modal, dialog, popover or
   * `aria-modal` layer is in front.
   */
  function selectContextViewByNumber(event: KeyboardEvent) {
    if (event.defaultPrevented) return;
    const index = resolveContextViewIndex(event);
    if (index === undefined) return;
    if (selectContextViewAt(index)) event.preventDefault();
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
   * Escape only releases that focus, so keyboard shortcuts work next. Runs
   * after the event bubbles so editors, modals, dialogs and popovers that
   * handle Escape stop it first;
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
    if (isLayerOnFront()) return;
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
