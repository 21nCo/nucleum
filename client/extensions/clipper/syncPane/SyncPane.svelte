<script lang="ts">
  import { onMount } from "svelte";
  import { syncStore } from "../contentScripts/store";
  import FeedbackPaneBase from "../feedbackPane/FeedbackPaneBase.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { SyncStatus } from "../contentScripts/types";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { Size } from "$lib/client/types/size.enum";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";

  onMount(() => {
    logger.log({ at: "SyncPane onMount", syncStore: $syncStore });
  });
  function resolveLabel() {
    if ($syncStore.id === NodeType.KINDLE_BOOK) return "Kindle highlights sync";
  }
  function resolveButtonLabel(status: SyncStatus) {
    switch (status) {
      case SyncStatus.SYNCED:
        return "Resync";
      case SyncStatus.SYNCING:
        return "Syncing...";
      case SyncStatus.NOT_SYNCED:
        return "Start sync";
      default:
        return "Start sync";
    }
  }
</script>

<FeedbackPaneBase>
  <div class="flex flex-col gap-3 h-40 justify-between">
    <div class="flex w-full justify-center items-center">{resolveLabel()}</div>
    <div class="flex w-full justify-center items-center">
      <Button
        icon="sync"
        size={Size.sm}
        type={ButtonVariant.PRIMARY}
        label={resolveButtonLabel($syncStore.status)}
        isDisabled={$syncStore.status === SyncStatus.SYNCING}
        on:click={() => {
          if ($syncStore.status === SyncStatus.SYNCING) return;
          appEvents.publish(ClipperExtensionEvent.START_SYNC);
        }}
      />
    </div>
    {#if $syncStore.status === SyncStatus.SYNCING}
      <div class="w-full flex justify-center">
        {#if $syncStore.progress}
          {$syncStore.progress}%
        {:else}
          Extracting...
        {/if}
      </div>
    {/if}
    {#if $syncStore.lastSyncedAt}
      <span class="text-b3 text-fgs3 w-full flex justify-center">
        <span>
          Last synced: {formatDatetime(
            $userPreferences,
            $syncStore.lastSyncedAt
          )}
        </span>
      </span>
    {/if}
  </div>
</FeedbackPaneBase>
