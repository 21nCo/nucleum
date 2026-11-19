<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { isRightDrawerOnFront } from "@21n/ui/actions/interaction-dom";
  import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
  import { KeyboardKey } from "@21n/ui/elements/keyboard/keyboard.type";
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { isViewKeyLayerOnFront } from "@nucleum/shell/shortcuts/front-layer";
  import {
    areSingleKeyShortcutsEnabled,
    markChordEndingKey
  } from "@nucleum/shell/shortcuts/page-keys";
  import {
    CHORD_TIMEOUT_MS,
    hasModifier,
    isChordEditableTarget,
    isChordStart,
    resolveChordSpaceIndex
  } from "@nucleum/shell/shortcuts/chord-keys";

  const isRegistered = (action: string) =>
    !!requireCommandHost().resolveAction(action);

  let pendingPrefix: string | undefined;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;
  let layerWatch: MutationObserver | undefined;

  function clearChord() {
    pendingPrefix = undefined;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = undefined;
    layerWatch?.disconnect();
    layerWatch = undefined;
  }

  /**
   * Ends the pending chord as soon as a modal, dialog, popover or modal sheet
   * opens, so one that opens and closes again before the second key, such as
   * with the mouse, still ends it. Popovers show and hide through their
   * class or inline style.
   */
  function watchLayers() {
    if (typeof MutationObserver === "undefined") return;
    layerWatch = new MutationObserver(() => {
      if (isRightDrawerOnFront() || isViewKeyLayerOnFront()) clearChord();
    });
    layerWatch.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "open",
        "aria-modal",
        "class",
        "style",
        "hidden",
        "inert"
      ]
    });
  }

  /**
   * Opens the pinned space in that app menu position. The space lookup loads
   * on first use, so the runner does not load spaces and the app menu itself.
   */
  async function openPinnedSpace(index: number) {
    try {
      const [{ resolvePinnedSpaceAt }, { navigation }, { resolveSpacePath }] =
        await Promise.all([
          import("@nucleum/shell/shortcuts/pinned-space-chord"),
          import("@nucleum/shell/navigation/navigation"),
          import("@nucleum/client/config/space-route")
        ]);
      const space = await resolvePinnedSpaceAt(index);
      if (space) navigation.gotoPath(resolveSpacePath(space.id));
    } catch (error) {
      logger.error(`Opening pinned space ${index + 1} failed`, error);
    }
  }

  /**
   * Starts a chord for 1.5 seconds on a plain G that no shortcut without a
   * prefix takes, with the same guards as the shortcut runner: not on
   * handsets, in a text field, behind a right-side drawer, while a modal,
   * dialog, popover or modal sheet is in front, or while single-key shortcuts
   * are off.
   */
  const startListener = (event: KeyboardEvent) => {
    if (!isChordStart(event)) return;
    if (!areSingleKeyShortcutsEnabled()) return;
    if ($context.embed === Embed.HANDSET) return;
    if (isChordEditableTarget(event.target)) return;
    if (isRightDrawerOnFront() || isViewKeyLayerOnFront()) return;
    if (keyboardShortcuts.resolveShortcut(event, { isRegistered }).shortcut)
      return;
    clearChord();
    pendingPrefix = event.key.toLowerCase();
    pendingTimer = setTimeout(clearChord, CHORD_TIMEOUT_MS);
    watchLayers();
    event.preventDefault();
  };

  /**
   * Runs the second key of a chord such as G then C, in the capture phase so
   * page shortcuts for the same key do not take it first. G then 1 to 9 opens the
   * pinned space in that app menu position. Typing in a field, or a right-side
   * drawer, modal, dialog, popover or modal sheet opened meanwhile (even one
   * closed again), or single-key shortcuts turned off meanwhile, ends the
   * chord and leaves the key to them. A plain Escape
   * on the page ends the chord and is consumed, so the shell does not also
   * close the top layer;
   * inside such a layer, or with a modifier (Cmd+Escape), Escape ends the
   * chord and passes on unchanged.
   * A chord the product does not register ends without running anything and
   * its key is consumed too. Any other key that is not a chord ends the chord
   * and passes on, marked so it does not also run a page's single-key action.
   */
  const captureListener = (event: KeyboardEvent) => {
    if (pendingPrefix === undefined) return;
    if (["Shift", "Meta", "Control", "Alt"].includes(event.key)) return;
    const prefix = pendingPrefix;
    clearChord();
    if (
      !areSingleKeyShortcutsEnabled() ||
      isChordEditableTarget(event.target) ||
      $context.embed === Embed.HANDSET ||
      isRightDrawerOnFront() ||
      isViewKeyLayerOnFront()
    )
      return;
    if (event.key === KeyboardKey.ESCAPE) {
      if (!hasModifier(event)) consume(event);
      return;
    }
    const spaceIndex = resolveChordSpaceIndex(prefix, event);
    if (spaceIndex !== undefined) {
      consume(event);
      void openPinnedSpace(spaceIndex);
      return;
    }
    const { shortcut } = keyboardShortcuts.resolveShortcut(event, {
      prefix,
      isRegistered
    });
    if (shortcut) {
      consume(event);
      requireCommandHost().runAction(shortcut.action);
      return;
    }
    if (keyboardShortcuts.resolveShortcut(event, { prefix }).shortcut)
      consume(event);
    else markChordEndingKey(event);
  };

  function consume(event: KeyboardEvent) {
    event.stopPropagation();
    event.preventDefault();
  }

  $effect(() => clearChord);
</script>

<svelte:window onkeydown={startListener} onkeydowncapture={captureListener} />
