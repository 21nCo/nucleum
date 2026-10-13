import { Size } from "@21n/ui/elements/size.enum";
import { Action } from "@nucleum/client/config/action.enum";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import TacoSettings from "@nucleum/products/memotron/taco/TacoSettings.svelte";

/** Memotron AI settings action assembled with the shared settings registry. */
export const aiSettingsAction: Required<Pick<IAction, "action">> &
  Partial<IAction> = {
  action: Action.ARTIFICIAL_INTELLIGENCE,
  cmdLabel: [{ variant: "aiSettings", label: "AI Settings" }],
  label: "Artificial Intelligence",
  icon: "cpu",
  component: TacoSettings,
  modalParams: {
    title: "Artificial Intelligence",
    layout: {
      size: Size.lg
    }
  }
};
