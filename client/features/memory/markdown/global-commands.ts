import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Action } from "@nucleum/client/config/action.enum";
import MdShortcuts from "@nucleum/features/memory/markdown/shortcuts/MdShortcuts.svelte";
import HotKeys from "@nucleum/features/memory/markdown/shortcuts/HotKeys.svelte";

/** Commands owned by memory; assembled in application composition. */
export const memoryCommands = {
  markdown_shortcuts: {
    action: Action.MARKDOWN_SHORTCUTS,
    label: "Markdown shortcuts",
    component: MdShortcuts,
    type: ActionType.MODAL,
    modalParams: {
      title: "Markdown shortcuts",
      layout: {
        size: Size.lg
      }
    }
  },
  hot_keys: {
    action: Action.HOT_KEYS,
    label: "See hot key shortcuts",
    component: HotKeys,
    type: ActionType.MODAL,
    modalParams: {
      title: "Hot key shortcuts",
      layout: {
        size: Size.lg
      }
    }
  }
} satisfies Record<string, IAction | IAction[]>;
