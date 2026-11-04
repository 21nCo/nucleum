import { navigation } from "@nucleum/shell/navigation/navigation";
import { sidebarState } from "@nucleum/shell/leftPanel/sidebar-state";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import ToastModalPortrait from "@nucleum/shell/notifications/ToastModalPortrait.svelte";
import { Size } from "@21n/ui/elements/size.enum";
import { isInEditMode } from "@nucleum/shared-state/app-context/app.store";
import { Action } from "@nucleum/client/config/action.enum";
import { AccessMode } from "@nucleum/datafn/resource.type";
import Navigator from "@nucleum/shell/navigator/Navigator.svelte";
import ComingSoonView from "@21n/ui/elements/ComingSoonView.svelte";
import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
import { requestNavigatorFocus } from "@nucleum/shell/navigator/navigator-focus";

/** Commands owned by shell; assembled in application composition. */
export const shellCommands = {
  mobile_toast: {
    action: Action.MOBILE_TOAST,
    component: ToastModalPortrait,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      layout: {
        size: Size.xs
      }
    }
  },
  edit_mode: {
    action: Action.EDIT_MODE,
    fn: async () => isInEditMode.toggle(),
    type: ActionType.FUNCTION,
    isMeta: true,
    label: "Edit mode"
  },
  toggle_sidebar: {
    action: Action.TOGGLE_SIDEBAR,
    type: ActionType.FUNCTION,
    label: "Toggle sidebar",
    fn: async () => {
      sidebarState.toggleSidebar();
    }
  },
  go_back: {
    action: Action.GO_BACK,
    label: "Go back",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      navigation.goBack();
    }
  },
  go_forward: {
    action: Action.GO_FORWARD,
    label: "Go forward",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      navigation.goForward();
    }
  },
  navigator: {
    action: Action.NAVIGATOR,
    icon: "ph:compass-light",
    label: "Navigator",
    type: ActionType.LIVE,
    component: Navigator,
    accessMode: AccessMode.PANEL,
    liveActionParams: {
      size: Size.sm
    }
  },
  open_navigator: {
    action: Action.OPEN_NAVIGATOR,
    label: "Open navigator",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      const panel = new URLSearchParams(window.location.search).get(
        AccessMode.PANEL
      );
      if (panel === Action.NAVIGATOR) {
        requestNavigatorFocus();
        return;
      }
      requireCommandHost().runAction(Action.NAVIGATOR);
    }
  },
  cycle_context_view: {
    action: Action.CYCLE_CONTEXT_VIEW,
    label: "Next view tab",
    type: ActionType.FUNCTION,
    fn: async () => {
      contextZone.cycle();
    }
  },
  rhombus: {
    action: Action.RHOMBUS,
    icon: "proicons:rhombus",
    label: "Rhombus",
    type: ActionType.LIVE,
    component: ComingSoonView,
    accessMode: AccessMode.PANEL,
    liveActionParams: {
      size: Size.md,
      isOpeningBehaviorConfigurable: true
    }
  }
} satisfies Record<string, IAction | IAction[]>;
