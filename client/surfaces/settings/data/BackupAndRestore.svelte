<script lang="ts">
  import { fileDrop } from "@21n/ui/actions/fileDrop.action";
  import { fileStore } from "@nucleum/shared-state/files/file.store";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import InlineInfoBanner from "@21n/ui/elements/text/InlineInfoBanner.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import {
    datafn,
    datafnRuntime,
    refreshNucleumDatafnStatus
  } from "@nucleum/datafn/datafn.store";
  import context from "@nucleum/client/runtime/context.store";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { ButtonVariant } from "@21n/ui/elements/button/button.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { InfoTextType } from "@21n/ui/elements/text/info.type";
  import type { DatafnImportResult } from "@nucleum/datafn/datafn.type";
  import { parseAndFormatDate } from "@21n/shared-utils/datetime/date-formatting";
  import { parse, stringify } from "@21n/shared-utils/json.utils";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import {
    detectLegacyLocalData,
    exportLegacyLocalData
  } from "@nucleum/persistence/legacy-backup/discovery";
  import { resolveLegacyImportableRecordCount } from "@nucleum/persistence/legacy-backup/summary";
  import type { LegacyLocalDataSummary } from "@nucleum/persistence/legacy-backup/types";
  import { onMount } from "svelte";
  import { showInfoToast } from "./data-settings-feedback";

  let isBackupInProgress = $state(false);
  let isRestoreInProgress = $state(false);
  let legacyLocalDataSummary = $state<LegacyLocalDataSummary | undefined>(
    undefined
  );
  let isLegacyLocalDataDetectionComplete = $state(false);
  let isLegacyLocalBackupInProgress = $state(false);
  const hasLocalDatafnStorage = $derived(Boolean($datafnRuntime?.storage));
  const legacyLocalRecordCount = $derived(
    resolveLegacyImportableRecordCount(legacyLocalDataSummary)
  );
  const hasLegacyLocalData = $derived(legacyLocalRecordCount > 0);

  onMount(() => {
    void refreshLegacyLocalDataSummary();
  });

  async function handleBackup() {
    isBackupInProgress = true;
    try {
      if (!$datafnRuntime?.storage) {
        showInfoToast("Local backup is not available in cloud direct mode");
        return;
      }
      const data = await datafn.exportData();
      const product = $appStore.product;
      const fileName = `${product}-backup-${parseAndFormatDate(new Date())}.json`;
      const blob = new Blob([stringify(data, { isPreventReplacer: true })], {
        type: "application/json"
      });
      const isDelivered = await fileStore.downloadFromBlob(blob, {
        fileName: fileName,
        fileNameForEmbed: `${product}_backup`,
        contentType: "application/json",
        isHandleEmbedCase: true
      });
      if (!isDelivered) throw new Error("Backup delivery failed");
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
      if (!$datafnRuntime?.storage) {
        showInfoToast("Restore is not available in cloud direct mode");
        return;
      }
      const data = await all[0].text();
      if (data) {
        if (!$datafnRuntime) return;
        const result = (await datafn.importData(parse(data), {
          triggerCloneUp: $datafnRuntime.mode === "sync"
        })) as DatafnImportResult;
        const skipped = [
          ...Object.values(result?.stats?.resources ?? {}),
          ...Object.values(result?.stats?.joins ?? {})
        ].reduce((total, stats) => total + (stats.skipped ?? 0), 0);
        if (result?.ok !== true || skipped > 0) {
          throw new Error(
            result?.errors?.[0]?.message ?? "DataFn restore failed"
          );
        }
        await refreshNucleumDatafnStatus();
        toasts.success("Data restored successfully");
      }
    } catch (e) {
      logger.error({ at: "DataSettings.handleDrop", error: e });
      toasts.error("Unable to restore data");
    } finally {
      isRestoreInProgress = false;
    }
  }

  async function refreshLegacyLocalDataSummary() {
    try {
      legacyLocalDataSummary = await detectLegacyLocalData($appStore.product);
    } catch (error) {
      logger.error({ at: "refreshLegacyLocalDataSummary", error });
      legacyLocalDataSummary = undefined;
    } finally {
      isLegacyLocalDataDetectionComplete = true;
    }
  }

  async function handleLegacyBackup() {
    isLegacyLocalBackupInProgress = true;
    try {
      const data = await exportLegacyLocalData($appStore.product);
      if (!data?.databases.length) {
        showInfoToast("No legacy local data was found on this device");
        await refreshLegacyLocalDataSummary();
        return;
      }
      const product = $appStore.product;
      const fileName = `${product}-legacy-local-backup-${parseAndFormatDate(new Date(), "iso-short")}.json`;
      const blob = new Blob([stringify(data, { isPreventReplacer: true })], {
        type: "application/json"
      });
      const isDelivered = await fileStore.downloadFromBlob(blob, {
        fileName,
        fileNameForEmbed: `${product}_legacy_local_backup`,
        contentType: "application/json",
        isHandleEmbedCase: true
      });
      if (!isDelivered) throw new Error("Legacy backup delivery failed");
      toasts.success("Legacy local backup downloaded successfully");
      await refreshLegacyLocalDataSummary();
    } catch (error) {
      logger.error({ at: "handleLegacyBackup", error });
      toasts.error("Unable to download legacy local backup");
    } finally {
      isLegacyLocalBackupInProgress = false;
    }
  }
</script>

<section class="flex flex-col gap-4">
  <Text content="Backup and restore" style={TextStyle.SECTION_HEADING} />
  <div class="flex items-center gap-4">
    <Button
      label="Backup"
      icon="download"
      type={ButtonVariant.PRIMARY}
      onclick={handleBackup}
      isLoading={isBackupInProgress}
      isDisabled={!hasLocalDatafnStorage}
    />
    <div use:fileDrop={{ accept: "application/json", onDrop: handleDrop }}>
      <Button
        label="Restore"
        icon="restore"
        isLoading={isRestoreInProgress}
        isDisabled={!hasLocalDatafnStorage}
      />
    </div>
  </div>
  <InlineInfoBanner
    type={InfoTextType.WARNING}
    size={Size.sm}
    content="Note: At the moment, Restore only works on new accounts. It might fail if old conflicting data is present."
  />
</section>
{#if isLegacyLocalDataDetectionComplete && hasLegacyLocalData}
  <section class="flex flex-col gap-4">
    <Text content="Legacy local data" style={TextStyle.SECTION_HEADING} />
    <InlineInfoBanner
      type={InfoTextType.WARNING}
      size={Size.sm}
      content={`Old local data was found on this device (${legacyLocalRecordCount} records across ${legacyLocalDataSummary?.databases.length ?? 0} databases). Use the startup recovery prompt to import it into DataFn, or download a raw backup before clearing browser data.`}
    />
    <div>
      <Button
        label="Download legacy backup"
        icon="download"
        type={ButtonVariant.SECONDARY}
        onclick={handleLegacyBackup}
        isLoading={isLegacyLocalBackupInProgress}
      />
    </div>
  </section>
{/if}
