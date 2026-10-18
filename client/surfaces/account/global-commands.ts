import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import Signup from "@nucleum/surfaces/account/authentication/Signup.svelte";
import ExtensionLoginStatusPage from "@nucleum/surfaces/account/ExtensionLoginStatusPage.svelte";
import { Action } from "@nucleum/client/config/action.enum";
import Bootstrap from "@nucleum/surfaces/account/setup/Bootstrap.svelte";

/** Commands owned by account; assembled in application composition. */
export const accountCommands = {
  extenstion_login: {
    action: Action.EXTENSTION_LOGIN,
    type: ActionType.PAGE,
    isMeta: true,
    component: ExtensionLoginStatusPage,
    isMenuHidden: true
  },
  signup: {
    action: "signup",
    component: Signup,
    type: ActionType.PAGE,
    isMeta: true,
    isMenuHidden: true
  },
  bootstrap: {
    action: "bootstrap",
    type: ActionType.PAGE,
    isMenuHidden: true,
    isMeta: true,
    component: Bootstrap
  }
} satisfies Record<string, IAction | IAction[]>;
