<script lang="ts">
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { fileStore } from "$lib/client/components/files/file.store";
  import { flux } from "$lib/client/components/flux/flux";
  import Button from "$lib/client/elements/button/Button.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import {
    confirmationNotification,
    toasts
  } from "$lib/client/stores/notification.store";
  import { Action } from "$lib/client/types/action.enum";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Product } from "$lib/client/types/product.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { parse, stringify } from "$lib/shared/utils/json.utils";
  import { logger } from "../debug/logger.client";

  let isBackupInProgress: boolean = false;
  let isRestoreInProgress: boolean = false;
  let isResyncInProgress: boolean = false;

  async function handleBackup() {
    isBackupInProgress = true;
    try {
      const data = await flux.export();
      const product = $appStore.product;
      const fileName = `${product}-backup-${formatDate(new Date())}.json`;
      const blob = new Blob([stringify(data, { isPreventReplacer: true })], {
        type: "application/json"
      });
      fileStore.downloadFromBlob(blob, {
        fileName: fileName,
        fileNameForEmbed: `${product}_backup`,
        contentType: "application/json",
        isHandleEmbedCase: true
      });
      if ($context.isEmbed) {
        toasts.success("Backup file downloaded successfully");
        return;
      }
    } catch (e) {
      console.error(e);
    } finally {
      isBackupInProgress = false;
    }
  }
  async function handleDrop(
    all: File[],
    valid: File[],
    errors: { file: File; type: string }[]
  ) {
    console.log("restore", all, valid, errors);
    isRestoreInProgress = true;
    try {
      const data = await all[0].text();
      if (data) {
        await flux.import(parse(data));
        toasts.success("Data restored successfully");
      }
    } catch (e) {
      console.error(e);
    } finally {
      isRestoreInProgress = false;
    }
  }

  async function handleClear() {
    confirmationNotification.notify({
      title: "Clear local cache",
      // size: Size.sm,
      askInputConfirmation: "clear data",
      message:
        "This will clear all data from your local cache and log you out. Your data will be lost if you are using offline mode.",
      confirmAction: {
        label: "Confirm",
        icon: "ph:trash-light",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          await flux.clear();
          toasts.success("Data cleared successfully");
          await account.signOut();
          return true;
        }
      }
    });
  }

  async function handleResync() {
    try {
      isResyncInProgress = true;
      const result = await flux.syncDown({ isReturnCount: true });
      if (result?.counts) {
        await flux.reconcile({
          counts: result.counts
        });
      }
      isResyncInProgress = false;
    } catch (e) {
      logger.error({ at: "handleResync", error: e });
    } finally {
      isResyncInProgress = false;
    }
  }
</script>

<main class="flex flex-col gap-12 text-left">
  <section class="flex flex-col gap-4">
    <Text content="Backup and restore" style={TextStyle.SECTION_HEADING} />
    <div class="flex items-center gap-4">
      <Button
        label="Backup"
        icon="ph:download-simple-light"
        type={ButtonVariant.PRIMARY}
        on:click={handleBackup}
        isLoading={isBackupInProgress}
      />
      <div use:fileDrop={{ accept: "application/json", onDrop: handleDrop }}>
        <Button
          label="Restore"
          icon="ph:arrow-u-up-left-light"
          on:click
          isLoading={isRestoreInProgress}
        />
      </div>
    </div>
    <InlineInfoBanner
      type={InfoTextType.WARNING}
      size={Size.sm}
      content="Note: At the moment, Restore only works on new accounts. It might fail if old conflicting data is present."
    />
  </section>
  <section class="flex flex-col gap-4">
    <Text content="Import and export" style={TextStyle.SECTION_HEADING} />
    <span class="text-b2 text-fgs2">
      We enormously value your privacy and data. We want to make Memotron as
      interoperable and sustainable as possible. We will keep extending our
      support to import/export data from other apps.
    </span>
    <div>
      {#if $appStore.product !== Product.POINTRON}
        <Button
          label="Import from other apps"
          icon="ph:download-simple-light"
          on:click={() => {
            appStore.runAction(Action.IMPORT_FROM_OTHER_APPS);
          }}
        />
      {/if}
    </div>
  </section>
  <section class="flex flex-col gap-4">
    <Text content="More" style={TextStyle.SECTION_HEADING} />
    <div class="flex items-center gap-4">
      <Button
        label="Resync data"
        icon="ph:arrow-counter-clockwise-light"
        isLoading={isResyncInProgress}
        on:click={handleResync}
      />
      {#if !$context.isEmbed}
        <Button
          label="Reload"
          icon="ph:arrow-counter-clockwise-light"
          on:click={() => window.location.reload()}
        />
      {/if}
      <Button
        label="Clear local cache"
        icon="ph:trash-light"
        on:click={handleClear}
        type={ButtonVariant.DANGER}
      />
    </div>
  </section>
</main>
