import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Orientation } from "@21n/ui/elements/direction.enum";
import modalEvent from "@nucleum/shell/overlays/modal.store";
import { Action } from "@nucleum/client/config/action.enum";
import UserPlan from "@nucleum/surfaces/subscription/UserPlan.svelte";
import InactivePlan from "@nucleum/surfaces/subscription/InactivePlan.svelte";
import { ButtonVariant } from "@21n/ui/elements/button/button.type";
import PaymentRedirect from "@nucleum/surfaces/subscription/PaymentRedirect.svelte";
import PlanOnboarding from "@nucleum/surfaces/subscription/PlanOnboarding.svelte";
import UserBilling from "@nucleum/surfaces/subscription/UserBilling.svelte";
import UserPlanCancellation from "@nucleum/surfaces/subscription/UserPlanCancellation.svelte";
import context from "@nucleum/client/runtime/context.store";

/** Commands owned by subscription; assembled in application composition. */
export const subscriptionCommands = {
  user_plan: {
    action: Action.USER_PLAN,
    type: ActionType.MODAL,
    isMeta: true,
    component: UserPlan,
    modalParams: {
      layout: {
        size: Size.full,
        orientation: Orientation.Horizontal
      }
    }
  },
  inactive_plan: {
    action: Action.INACTIVE_PLAN,
    type: ActionType.MODAL,
    isMeta: true,

    component: InactivePlan,
    modalParams: {
      isDismissable: false,
      layout: {
        size: Size.md,
        orientation: Orientation.Horizontal,
        primaryAction: {
          label: "Upgrade now",
          icon: "sparkle",
          variant: ButtonVariant.PRIMARY,
          callback: async () => {
            requireCommandHost().runAction(Action.USER_PLAN);
          }
        },
        secondaryAction: {
          label: "Use offline",
          icon: "offline",
          variant: ButtonVariant.SECONDARY,
          callback: async () => {
            await context.toggleOfflineMode(true);
            modalEvent.hide(Action.INACTIVE_PLAN);
          }
        }
      }
    }
  },
  pay: {
    action: "pay",
    type: ActionType.PAGE,
    component: PaymentRedirect
  },
  plan_onboarding: {
    action: Action.PLAN_ONBOARDING,
    isMeta: true,
    type: ActionType.MODAL,
    component: PlanOnboarding,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  user_billing: {
    action: Action.USER_BILLING,
    label: "Billing",
    icon: "wallet",
    type: ActionType.MODAL,
    component: UserBilling,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  user_plan_cancelation: {
    action: Action.USER_PLAN_CANCELATION,
    isMeta: true,
    type: ActionType.MODAL,
    component: UserPlanCancellation,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Vertical
      }
    }
  }
} satisfies Record<string, IAction | IAction[]>;
