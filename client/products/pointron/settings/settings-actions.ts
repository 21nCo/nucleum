import { Size } from "@21n/ui/elements/size.enum";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { PointronAction } from "@nucleum/client/config/focus-action.enum";
import AnalyticsSettings from "./AnalyticsSettings.svelte";
import SessionSettings from "./SessionSettings.svelte";

/** Pointron settings actions consumed by application registry assembly. */
export const pointronSettingsActions = {
  session: {
    action: PointronAction.SESSION_SETTINGS_MODAL,
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Focus",
    path: "cp/session",
    icon: "circle",
    type: ActionType.MODAL,
    component: SessionSettings,
    modalParams: {
      title: "Focus Settings",
      layout: {
        size: Size.lg,
        primaryAction: {
          label: "Done"
        }
      }
    }
  },
  analytics: {
    action: "analytics-settings",
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Analytics",
    path: "cp/analytic-settings",
    icon: "chart-line-up",
    type: ActionType.MODAL,
    component: AnalyticsSettings,
    modalParams: {
      title: "Analytics Settings"
    }
  }
} satisfies Record<string, IAction>;
