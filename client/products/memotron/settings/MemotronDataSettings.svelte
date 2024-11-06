<script lang="ts">
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { flux } from "$lib/client/components/flux/flux";
  import Button from "$lib/client/elements/button/Button.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import account from "$lib/client/stores/account.store";
  import {
    confirmationNotification,
    toasts
  } from "$lib/client/stores/notification.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { downloadJson } from "$lib/client/utils/utils";

  let isBackupInProgress: boolean = false;
  let isRestoreInProgress: boolean = false;

  async function handleBackup() {
    isBackupInProgress = true;
    try {
      const data = await flux.export();
      downloadJson(
        JSON.stringify(data),
        `memotron-backup-${formatDate(new Date())}`
      );
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
        await flux.import(JSON.parse(data));
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
          await account.signOut();
          await flux.clear();
          toasts.success("Data cleared successfully");
          window.location.reload();
          return true;
        }
      }
    });
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
      content="Note: At the moment, Restore only works on new accounts. It might fail if old conflicting data is present."
    />
  </section>
  <section class="flex flex-col gap-4">
    <Text content="Import and export" style={TextStyle.SECTION_HEADING} />
    <span class="text-b2 text-fgs3">
      We value your privacy and data. We also want to make Memotron as
      interoperable as possible. We will be releasing these features on priority
      soon.
    </span>
  </section>
  <section class="flex flex-col gap-4">
    <Text content="More" style={TextStyle.SECTION_HEADING} />
    <div class="flex items-center gap-4">
      <Button
        label="Reload"
        icon="ph:arrow-counter-clockwise-light"
        on:click={() => window.location.reload()}
      />
      <Button
        label="Clear local cache"
        tooltip="This will clear all data from your local cache and log you out. You will have to re-sync the data from the cloud."
        icon="ph:trash-light"
        on:click={handleClear}
        type={ButtonVariant.DANGER}
      />
    </div>
  </section>
</main>
