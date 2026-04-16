<script lang="ts">
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import context from "@21n/stores/context.store";
  import { Size } from "@21n/types/size.enum";
  import SyncStatus from "@21n/components/settings/sync/SyncStatus.svelte";
  import account from "@21n/stores/account.store";
  import { PlanType } from "@21n/components/subscription/userPlan.type";
  let isInOfflineMode = $state(false);
  const isNetworkInducedOfflineMode = !navigator.onLine;
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
  <div class="flex w-full justify-center mt-8">
    <SyncStatus />
  </div>
</div>
