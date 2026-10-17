import { get } from "svelte/store";

import account from "@nucleum/client/runtime/account/account.store";

import context from "@nucleum/client/runtime/context.store";

import posthog from "posthog-js";

import { nucleumDatafnStatus } from "@nucleum/datafn/datafn.store";

/** Identifies a cloud user for analytics after application data initialization. */
export async function initializeUserConfig() {
  console.time("initializeUserConfig");
  const isLiteMode = get(context).isSheet;
  if (
    (get(nucleumDatafnStatus).nucleumMode === "sync" ||
      get(nucleumDatafnStatus).nucleumMode === "sync-direct") &&
    !isLiteMode
  ) {
    setAnalyticsUserIdentity();
  }
  console.timeEnd("initializeUserConfig");
  function setAnalyticsUserIdentity() {
    const userInfo = get(account).userInfo;
    if (!userInfo) return;
    posthog.identify(userInfo.id, {
      region: userInfo.region
    });
  }
}
