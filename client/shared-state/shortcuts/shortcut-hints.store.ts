import { derived } from "svelte/store";
import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
import context from "@nucleum/client/runtime/context.store";
import { Embed } from "@nucleum/client/runtime/context.type";
import { syncElementShortcutHints } from "@21n/ui/hosts/shortcut-host";

/** Shortcut hints follow persisted preferences and current product/device context. */
export const shortcutHints = derived(
  [
    uiState.observeState(UIState.hideShortcutHints, {
      scope: UIStateScope.DEVICE
    }),
    context
  ],
  ([disabled, ctx]) => ({
    isShowHotKeyHints: !disabled && ctx.embed !== Embed.HANDSET
  })
);

shortcutHints.subscribe((value) =>
  syncElementShortcutHints(value.isShowHotKeyHints)
);
