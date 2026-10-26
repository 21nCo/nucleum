import { get } from "svelte/store";

import { subscription } from "@nucleum/surfaces/subscription/subscription";

import account from "@nucleum/client/runtime/account/account.store";

import { UserDataMode } from "@nucleum/client/runtime/account/account.type";

import { BillingCycle } from "@nucleum/schema/account/subscription";

import { PaymentProvider } from "@nucleum/schema/account/payment-provider";

/** Reconciles externally managed recurring plans without changing local plans. */
export async function syncAccountPaidPlanFromExternalProvider() {
  if (
    get(account).dataMode === UserDataMode.LOCAL ||
    !get(account).plan?.provider ||
    get(account).plan?.provider === PaymentProvider.SELF ||
    get(account).plan?.cycle === BillingCycle.LIFETIME
  )
    return;
  const response = await subscription.modifySubscription({
    type: "sync"
  });
  if (response.userPlan) {
    subscription.handlePlanStatus(response.userPlan);
  }
}
