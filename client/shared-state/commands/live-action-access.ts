import { AccessMode } from "@nucleum/datafn/resource.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import type { IViewStore } from "@21n/ui/environment/view.type";
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

/**
 * Whether the right panel can render in `view`: as a sheet in portrait, or
 * beside the page when the width is not constrained.
 */
export function canRenderRightPanel(
  view: Pick<IViewStore, "isPortrait" | "isConstrainedWidth">
) {
  return view.isPortrait || !view.isConstrainedWidth;
}

/**
 * Whether the right panel shows as a full-screen sheet in `view`: in portrait,
 * and on a constrained landscape view, where it cannot render beside the page,
 * so a panel already open there keeps its tool instead of being removed.
 */
export function isRightPanelSheet(
  view: Pick<IViewStore, "isPortrait" | "isConstrainedWidth">
) {
  return view.isPortrait || !canRenderRightPanel(view);
}

/**
 * Resolves where a live action opens in `view`: where it is set to open, or
 * the overlay when that is the right panel and the panel cannot render there.
 */
export function resolveEffectiveLiveActionAccessMode(
  action: IAction,
  view: Pick<IViewStore, "isPortrait" | "isConstrainedWidth">
): AccessMode {
  const mode = resolveLiveActionAccessMode(action);
  return mode === AccessMode.PANEL && !canRenderRightPanel(view)
    ? AccessMode.OVERLAY
    : mode;
}

/** Mode the live action `action` is open in now, read from `url`. */
export function resolveOpenLiveActionAccessMode(action: string, url: URL) {
  return liveActionAccessModes.find(
    (mode) => url.searchParams.get(mode) === action
  );
}

/** Saves where a configurable live action opens. */
export function saveLiveActionAccessMode(action: string, mode: AccessMode) {
  uiState.setState(UIState.liveActionAccessMode, mode, stateParams(action));
}
