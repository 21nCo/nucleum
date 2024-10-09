<script lang="ts">
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import context from "$lib/client/stores/context.store";
  import SyncStatus from "./SyncStatus.svelte";
  let isInOfflineMode = $context.isInOfflineMode;
  let isInLowDataMode = $context.isInLowDataMode;
  const isNetworkInducedOfflineMode = !navigator.onLine;
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
      isInOfflineMode = !isInOfflineMode;
      await clientStorage.set(ClientStorageKey.OFFLINE_MODE, isInOfflineMode);
      $context.isInOfflineMode = isInOfflineMode;
    }}
  />
  <SwitchInput
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
  />

  <InlineInfoBanner
    content="Note: Offline mode will be automatically turned on when you are not connected to the internet."
  />
  <div class="flex w-full justify-center mt-8">
    <!-- <span class="text-b3 text-fgs3">Sync status</span> -->
    <SyncStatus />
  </div>
</div>
