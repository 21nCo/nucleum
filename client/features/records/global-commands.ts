import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Action } from "@nucleum/client/config/action.enum";
import CoverPicker from "@nucleum/features/records/cover/CoverPicker.svelte";

/** Commands owned by records; assembled in application composition. */
export const recordsCommands = {
  cover_picker: {
    action: Action.COVER_PICKER,
    component: CoverPicker,
    isMeta: true,
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.lg
      }
    }
  }
} satisfies Record<string, IAction | IAction[]>;
