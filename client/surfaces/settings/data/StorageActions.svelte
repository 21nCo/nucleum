<script lang="ts">
  import Button from "@21n/ui/elements/button/Button.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { accountSession } from "@nucleum/surfaces/account/account-session";
  import {
    clearDatafnLocalData,
    datafnRuntime,
    reconcileDatafnNow
  } from "@nucleum/datafn/datafn.store";
  import context from "@nucleum/client/runtime/context.store";
  import {
    confirmationNotification,
    toasts
  } from "@nucleum/shared-state/notifications/notification.store";
  import { ButtonVariant } from "@21n/ui/elements/button/button.type";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { showInfoToast } from "./data-settings-feedback";

  let isResyncInProgress = $state(false);
  const hasLocalDatafnStorage = $derived(Boolean($datafnRuntime?.storage));
  const canResyncData = $derived($datafnRuntime?.mode === "sync");

  async function handleClear() {
    if (!$datafnRuntime?.storage) {
      showInfoToast("There is no local DataFn cache to clear");
      return;
    }
    confirmationNotification.notify({
      title: "Clear local cache",
      askInputConfirmation: "clear data",
      message:
        "This will clear all data from your local cache and log you out. Your data will be lost if you are using offline mode.",
      confirmAction: {
        label: "Confirm",
        icon: "trash",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          await clearDatafnLocalData();
          toasts.success("Data cleared successfully");
          await accountSession.signOut();
          return true;
        }
      }
    });
  }

  async function handleResync() {
    if (!canResyncData) return;
    try {
      isResyncInProgress = true;
      await reconcileDatafnNow();
      isResyncInProgress = false;
    } catch (e) {
      logger.error({ at: "handleResync", error: e });
    } finally {
      isResyncInProgress = false;
    }
  }
</script>

<section class="flex flex-col gap-4">
  <Text content="More" style={TextStyle.SECTION_HEADING} />
  <div class="flex items-center gap-4">
    <Button
      label="Resync data"
      icon="reload"
      isLoading={isResyncInProgress}
      onclick={handleResync}
      isDisabled={!canResyncData}
    />
    {#if !$context.isEmbed}
      <Button
        label="Reload"
        icon="reload"
        onclick={() => window.location.reload()}
      />
    {/if}
    <Button
      label="Clear local cache"
      icon="trash"
      onclick={handleClear}
      type={ButtonVariant.DANGER}
      isDisabled={!hasLocalDatafnStorage}
    />
  </div>
</section>
