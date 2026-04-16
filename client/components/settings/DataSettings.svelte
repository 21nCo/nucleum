<script lang="ts">
  import { fileDrop } from "@21n/actions/fileDrop.action";
  import { fileStore } from "@21n/components/files/file.store";
  import { flux } from "@21n/components/flux/flux";
  import Button from "@21n/elements/button/Button.svelte";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import account from "@21n/stores/account.store";
  import { appStore } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import {
    confirmationNotification,
    toasts
  } from "@21n/stores/notification.store";
  import { Action } from "@21n/types/action.enum";
  import { ButtonVariant } from "@21n/types/button.type";
  import { Product } from "@21n/products/product.type";
  import { Size } from "@21n/types/size.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { InfoTextType } from "@21n/types/text.type";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import { parse, stringify } from "@21n/shared-utils/json.utils";
  import { logger } from "@21n/components/debug/logger.client";

  let isBackupInProgress: boolean = false;
  let isRestoreInProgress: boolean = false;
  let isResyncInProgress: boolean = false;

  async function handleBackup() {
    isBackupInProgress = true;
    try {
      const data = await flux.export();
      const product = $appStore.product;
      const fileName = `${product}-backup-${parseAndFormatDate(new Date())}.json`;
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
        icon: "trash",
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
        icon="download"
        type={ButtonVariant.PRIMARY}
        onclick={handleBackup}
        isLoading={isBackupInProgress}
      />
      <div use:fileDrop={{ accept: "application/json", onDrop: handleDrop }}>
        <Button
          label="Restore"
          icon="restore"
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
          icon="download"
          onclick={() => {
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
        icon="reload"
        isLoading={isResyncInProgress}
        onclick={handleResync}
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
      />
    </div>
  </section>
</main>
