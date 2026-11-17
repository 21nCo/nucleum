<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import {
    isRightDrawerOnFront,
    isTextElement
  } from "@21n/ui/actions/interaction-dom";
  import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
  import { KeyboardKey } from "@21n/ui/elements/keyboard/keyboard.type";
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
  import {
    createPinnedSpacesStore,
    orderPinnedSpaces,
    toPinnedSpacesKey
  } from "@nucleum/shell/navigation/pinned-spaces";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { resolveSpacePath } from "@nucleum/client/config/space-route";
  import {
    CHORD_TIMEOUT_MS,
    resolveChordSpaceIndex
  } from "@nucleum/shell/shortcuts/chord-keys";

  const pinnedIds = $derived(appMenuStore.pinnedSpaces($appMenuStore));
  const pinnedKey = $derived(toPinnedSpacesKey(pinnedIds));
  const pinnedSpacesStore = $derived(createPinnedSpacesStore(pinnedKey));
  const pinnedSpaces = $derived(
    orderPinnedSpaces(pinnedIds, $pinnedSpacesStore.data)
  );

  const isRegistered = (action: string) =>
    !!requireCommandHost().resolveAction(action);

  let pendingPrefix: string | undefined;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;

  function clearChord() {
    pendingPrefix = undefined;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = undefined;
  }

  /**
   * Starts a chord for 1.5 seconds on a plain prefix key such as G that no
   * shortcut without a prefix takes, with the same guards as the shortcut
   * runner: not on handsets, in a text field, or behind a right-side drawer.
   */
  const startListener = (event: KeyboardEvent) => {
    if ($context.embed === Embed.HANDSET) return;
    if (isTextElement(event.target)) return;
    if (isRightDrawerOnFront()) return;
    if (!keyboardShortcuts.isChordPrefix(event)) return;
    if (keyboardShortcuts.resolveShortcut(event, { isRegistered }).shortcut)
      return;
    clearChord();
    pendingPrefix = event.key.toLowerCase();
    pendingTimer = setTimeout(clearChord, CHORD_TIMEOUT_MS);
    event.preventDefault();
  };

  /**
   * Runs the second key of a chord such as G then C, in the capture phase so
   * page shortcuts for the same key do not take it first. G then 1 to 9 opens the
   * pinned space in that app menu position. Escape, typing in a field or any
   * key that is not a chord ends the chord and passes on unchanged.
   */
  const captureListener = (event: KeyboardEvent) => {
    if (pendingPrefix === undefined) return;
    if (["Shift", "Meta", "Control", "Alt"].includes(event.key)) return;
    const prefix = pendingPrefix;
    clearChord();
    if (
      event.key === KeyboardKey.ESCAPE ||
      isTextElement(event.target) ||
      $context.embed === Embed.HANDSET
    )
      return;
    const spaceIndex = resolveChordSpaceIndex(prefix, event);
    if (spaceIndex !== undefined) {
      const space = pinnedSpaces[spaceIndex];
      if (space) navigation.gotoPath(resolveSpacePath(space.id));
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    const { shortcut } = keyboardShortcuts.resolveShortcut(event, {
      prefix,
      isRegistered
    });
    if (!shortcut) return;
    requireCommandHost().runAction(shortcut.action);
    event.stopPropagation();
    event.preventDefault();
  };

  $effect(() => clearChord);
</script>

<svelte:window onkeydown={startListener} onkeydowncapture={captureListener} />
