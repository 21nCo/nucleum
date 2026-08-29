<script lang="ts">
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import context from "@21n/stores/context.store";
  import { Size } from "@21n/types/size.enum";
  import SyncStatus from "@21n/components/settings/sync/SyncStatus.svelte";
  import account from "@21n/stores/account.store";
  import { PlanType } from "@21n/components/subscription/userPlan.type";
  import { appStore } from "@21n/stores/app.store";
  import {
    nucleumDatafnStatus,
    initializeNucleumDatafn,
    resolveDatafnOfflinabilityPreference,
    setDatafnOfflinabilityPreference
  } from "@21n/stores/datafn.store";
  import { getDapId } from "@21n/persistence/persistence.utils";
  import { UserDataMode } from "@21n/types/account.type";
  import { onMount } from "svelte";
  let isInOfflineMode = $state(false);
  let isOfflinabilityEnabled = $state(true);
  let isSwitchingOfflinability = $state(false);
  const isNetworkInducedOfflineMode = !navigator.onLine;
  const isLocalDataMode = $derived($account.dataMode === UserDataMode.LOCAL);
  const isOfflinabilityToggleDisabled = $derived(
    isNetworkInducedOfflineMode ||
      isInOfflineMode ||
      isLocalDataMode ||
      isSwitchingOfflinability
  );
  const trialExpiry = $derived(
    $account.plan?.plan === PlanType.TRIAL && $account.plan?.trialPlan?.expiry
      ? new Date($account.plan.trialPlan.expiry)
      : null
  );
  const isTrialExpired = $derived(
    trialExpiry ? new Date() > trialExpiry : false
  );

  $effect(() => {
    isInOfflineMode = $context.isInOfflineMode;
  });

  onMount(() => {
    void resolveDatafnOfflinabilityPreference().then((value) => {
      isOfflinabilityEnabled = value;
    });
  });

  async function handleOfflinabilityChange() {
    const nextValue = !isOfflinabilityEnabled;
    if (!nextValue && $nucleumDatafnStatus.pendingChanges > 0) {
      window.alert(
        "Please sync pending changes before turning off offline availability."
      );
      return;
    }
    isSwitchingOfflinability = true;
    try {
      isOfflinabilityEnabled = nextValue;
      await setDatafnOfflinabilityPreference(nextValue);
      const dapId = await getDapId();
      await initializeNucleumDatafn({
        product: $appStore.product,
        account: $account,
        env: $appStore.env,
        appVersion: $appStore.version + "." + $appStore.build,
        dapId: dapId ?? undefined,
        isOffline: $context.isInOfflineMode,
        isOfflinabilityEnabled: nextValue
      });
    } catch {
      isOfflinabilityEnabled = !nextValue;
      await setDatafnOfflinabilityPreference(!nextValue);
      window.alert("Unable to change offline availability. Please try again.");
    } finally {
      isSwitchingOfflinability = false;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <SwitchInput
    label={{
      label: "Turn on offline mode"
    }}
    isExpanded={true}
    checked={isInOfflineMode}
    isDisabled={isNetworkInducedOfflineMode}
    onChange={async () => {
      if (isTrialExpired && isInOfflineMode) {
        window.alert(
          "Your trial has expired. Please upgrade to a paid plan to continue using cloud sync."
        );
        return;
      }
      isInOfflineMode = !isInOfflineMode;
      await context.toggleOfflineMode(isInOfflineMode);
    }}
  />
  <InlineInfoBanner
    content="Note: Offline mode will be automatically turned on when you are not connected to the internet or if your cloud sync trial expires."
    size={Size.sm}
  />
  <SwitchInput
    label={{
      label: "Keep data available offline"
    }}
    isExpanded={true}
    checked={isOfflinabilityEnabled}
    isDisabled={isOfflinabilityToggleDisabled}
    onChange={handleOfflinabilityChange}
  />
  <InlineInfoBanner
    content="When this is off, this device reads and writes directly through cloud sync and does not keep a local IndexedDB copy for offline use."
    size={Size.sm}
  />
  <div class="flex w-full justify-center mt-8">
    <SyncStatus />
  </div>
</div>
