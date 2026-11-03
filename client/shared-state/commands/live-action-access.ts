import { AccessMode } from "@nucleum/datafn/resource.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
import {
  UIState,
  UIStateScope
} from "@nucleum/shared-state/preferences/ui-state/uiState.type";

/** Opening modes a user can choose for a configurable live action. */
export const liveActionAccessModes = [AccessMode.OVERLAY, AccessMode.PANEL];

function stateParams(action: string) {
  return { scope: UIStateScope.PRODUCT, subVariables: [action] };
}

/** Whether the user can switch where this live action opens. */
export function isLiveActionAccessConfigurable(action: IAction | undefined) {
  return !!action?.liveActionParams?.isOpeningBehaviorConfigurable;
}

/**
 * Resolves where a live action opens: the user's saved choice when the action
 * allows one, otherwise its default, falling back to the right panel.
 */
export function resolveLiveActionAccessMode(action: IAction): AccessMode {
  if (isLiveActionAccessConfigurable(action)) {
    const saved = uiState.getState(
      UIState.liveActionAccessMode,
      stateParams(action.action)
    );
    if (liveActionAccessModes.includes(saved)) return saved as AccessMode;
  }
  return action.accessMode ?? AccessMode.PANEL;
}

/** Saves where a configurable live action opens. */
export function saveLiveActionAccessMode(action: string, mode: AccessMode) {
  uiState.setState(UIState.liveActionAccessMode, mode, stateParams(action));
}
