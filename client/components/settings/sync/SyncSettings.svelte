<script lang="ts">
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import context from "$lib/client/stores/context.store";
  import { Size } from "$lib/client/types/size.enum";
  import SyncStatus from "./SyncStatus.svelte";
  import account from "$lib/client/stores/account.store";
  import { PlanType } from "$lib/client/components/subscription/userPlan.type";

  let isInOfflineMode = $context.isInOfflineMode;
  let isInLowDataMode = $context.isInLowDataMode;
  const isNetworkInducedOfflineMode = !navigator.onLine;
  $: trialExpiry =
  $account.plan?.plan === PlanType.TRIAL && $account.plan?.trialPlan?.expiry
    ? new Date($account.plan.trialPlan.expiry)
    : null;
  $: isTrialExpired = trialExpiry ? new Date() > trialExpiry : false;
</script>

<div class="flex flex-col gap-4">
  <SwitchInput
    label={{
      label: "Turn on offline mode"
    }}
    isExpanded={true}
    checked={isInOfflineMode}
    isDisabled={isNetworkInducedOfflineMode}
    on:change={async () => {
      if(isTrialExpired && isInOfflineMode) {
        window.alert("Your trial has expired. Please upgrade to a paid plan to continue using cloud sync.");
        return;
      }
      isInOfflineMode = !isInOfflineMode;
      await context.toggleOfflineMode(isInOfflineMode);
    }}
  />
  <!-- <SwitchInput
    label={{
      label: "Turn on low data mode",
      tooltip: {
        body: "We will try to reduce the amount of data consumed by the app when you are on low data mode."
      }
    }}
    isExpanded={true}
    checked={isInLowDataMode}
    on:change={async () => {
      isInLowDataMode = !isInLowDataMode;
      await clientStorage.set(ClientStorageKey.LOW_DATA_MODE, isInLowDataMode);
      $context.isInLowDataMode = isInLowDataMode;
    }}
  /> -->

  <InlineInfoBanner
    content="Note: Offline mode will be automatically turned on when you are not connected to the internet or if your cloud sync trial expires."
    size={Size.sm}
  />
  <div class="flex w-full justify-center mt-8">
    <!-- <span class="text-b3 text-fgs3">Sync status</span> -->
    <SyncStatus />
  </div>
</div>
