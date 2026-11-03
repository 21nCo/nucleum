import { derived, writable } from "svelte/store";
import { player } from "@nucleum/shell/overlays/modal.store";

/**
 * True while a page shows the running session itself, such as the Pointron
 * phone home, so the docked portrait mini player stays hidden.
 */
export const isPlayerShownInPage = writable(false);

/** Whether the portrait mini player is docked at the bottom of the screen. */
export const isPortraitMiniPlayerDocked = derived(
  [player, isPlayerShownInPage],
  ([$player, $isPlayerShownInPage]) => $player.isMiniOn && !$isPlayerShownInPage
);
