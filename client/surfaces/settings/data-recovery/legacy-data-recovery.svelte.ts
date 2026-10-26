import { get } from "svelte/store";

import account from "@nucleum/client/runtime/account/account.store";
import { appStore } from "@nucleum/shared-state/app-context/app.store";

import context from "@nucleum/client/runtime/context.store";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";

import { isExtensionEnvironment } from "@21n/shared-utils/browser-environment";

import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import { logger } from "@nucleum/client/runtime/logging/logger";

import { fileStore } from "@nucleum/shared-state/files/file.store";

import { stringify } from "@21n/shared-utils/json.utils";
import { parseAndFormatDate } from "@21n/shared-utils/datetime/date-formatting";

import {
  cloneUpAllDatafnData,
  nucleumDatafnStatus,
  type NucleumDatafnRuntime
} from "@nucleum/datafn/datafn.store";
import {
  detectLegacyLocalData,
  exportLegacyLocalData
} from "@nucleum/persistence/legacy-backup/discovery";
import {
  completeLegacyLocalDataCloudUpload,
  getLegacyLocalDataRecoveryDecision,
  hasPendingLegacyLocalDataCloudUpload,
  saveLegacyLocalDataRecoveryDecision
} from "@nucleum/persistence/legacy-backup/recovery-decisions";
import {
  hasRecoverableLegacyLocalData,
  resolveLegacyLocalDataRecordCount
} from "@nucleum/persistence/legacy-backup/summary";
import type {
  LegacyLocalDataBackup,
  LegacyLocalDataSummary
} from "@nucleum/persistence/legacy-backup/types";

import { importLegacyLocalDataBackup } from "@nucleum/surfaces/settings/data-recovery/import-legacy-data";

/** Coordinates recovery decisions while the application retains startup sequencing. */
export function createLegacyDataRecovery({
  initializeDatabase,
  completeApplicationStartup,
  startApplication,
  onLoading
}: {
  initializeDatabase: (options?: {
    isOfflinabilityEnabled?: boolean;
  }) => Promise<NucleumDatafnRuntime | undefined>;
  completeApplicationStartup: () => Promise<void>;
  startApplication: () => Promise<void>;
  onLoading: (message: { message: string; subMessage?: string }) => void;
}) {
  let legacyRecoveryMode = $state<
    "required" | "importing" | "downloading" | null
  >(null);
  let legacyRecoveryError = $state<string | undefined>();
  let legacyLocalDataSummary = $state<LegacyLocalDataSummary | undefined>();
  let isLegacyCloudUploadPending = $state(false);
  let isLegacyCloudUploadInProgress = false;
  async function prepareLegacyLocalDataRecoveryGate() {
    if (get(context).isSheet || isExtensionEnvironment()) return false;
    try {
      isLegacyCloudUploadPending = await hasPendingLegacyLocalDataCloudUpload(
        get(appStore).product
      );
      const summary = await detectLegacyLocalData(get(appStore).product);
      if (!summary.isSupported || !hasRecoverableLegacyLocalData(summary)) {
        return false;
      }
      const decision = await getLegacyLocalDataRecoveryDecision(
        get(appStore).product,
        summary
      );
      if (decision) {
        isLegacyCloudUploadPending =
          isLegacyCloudUploadPending || Boolean(decision.isCloudUploadPending);
        return false;
      }
      legacyLocalDataSummary = summary;
      legacyRecoveryMode = "required";
      return true;
    } catch (error) {
      logger.error({ at: "prepareLegacyLocalDataRecoveryGate", error });
      return false;
    }
  }

  async function handleImportLegacyLocalData() {
    if (!legacyLocalDataSummary || legacyRecoveryMode !== "required") return;
    legacyRecoveryMode = "importing";
    legacyRecoveryError = undefined;
    onLoading({
      message: "Importing old local data...",
      subMessage: "Preparing a local backup first."
    });
    try {
      const backup = await exportLegacyLocalData(get(appStore).product);
      if (!backup?.databases.length) {
        legacyRecoveryMode = null;
        const runtime = await initializeDatabase();
        if (runtime) {
          await completeApplicationStartup();
        }
        return;
      }
      const runtime = await initializeDatabase({
        isOfflinabilityEnabled: true
      });
      if (!runtime) return;
      const importStats = await importLegacyLocalDataBackup(runtime, backup);
      const isCloudUploadPending =
        get(account).dataMode === UserDataMode.CLOUD &&
        runtime.mode === "local-only";
      await saveLegacyLocalDataRecoveryDecision(
        {
          version: 1,
          product: get(appStore).product,
          action: "import_old_data",
          decidedAt: new Date().toISOString(),
          backupExportedAt: backup.exportedAt,
          sourceRecordCount: resolveLegacyLocalDataRecordCount(backup),
          importedResourceCount: importStats.resources,
          importedJoinCount: importStats.joins,
          isCloudUploadPending
        },
        backup
      );
      isLegacyCloudUploadPending =
        isLegacyCloudUploadPending || isCloudUploadPending;
      legacyRecoveryMode = null;
      toasts.success("Old local data imported successfully");
      await completeApplicationStartup();
    } catch (error) {
      logger.error({ at: "handleImportLegacyLocalData", error });
      legacyRecoveryError =
        "Unable to import old local data. Download backup and continue is still available.";
      legacyRecoveryMode = "required";
    }
  }

  async function handleDownloadLegacyBackupAndContinue() {
    if (!legacyLocalDataSummary || legacyRecoveryMode === "importing") return;
    legacyRecoveryMode = "downloading";
    legacyRecoveryError = undefined;
    try {
      const backup = await exportLegacyLocalData(get(appStore).product);
      if (backup?.databases.length) {
        await downloadLegacyLocalBackup(backup);
        await saveLegacyLocalDataRecoveryDecision(
          {
            version: 1,
            product: get(appStore).product,
            action: "download_backup_continue",
            decidedAt: new Date().toISOString(),
            backupExportedAt: backup.exportedAt,
            sourceRecordCount: resolveLegacyLocalDataRecordCount(backup)
          },
          backup
        );
        toasts.success("Legacy local backup downloaded successfully");
      }
      legacyRecoveryMode = null;
      await startApplication();
    } catch (error) {
      logger.error({ at: "handleDownloadLegacyBackupAndContinue", error });
      legacyRecoveryError = "Unable to download legacy local backup.";
      legacyRecoveryMode = "required";
    }
  }

  async function downloadLegacyLocalBackup(backup: LegacyLocalDataBackup) {
    const product = get(appStore).product;
    const fileName = `${product}-legacy-local-backup-${parseAndFormatDate(new Date(), "iso-short")}.json`;
    const blob = new Blob([stringify(backup, { isPreventReplacer: true })], {
      type: "application/json"
    });
    const isDelivered = await fileStore.downloadFromBlob(blob, {
      fileName,
      fileNameForEmbed: `${product}_legacy_local_backup`,
      contentType: "application/json",
      isHandleEmbedCase: true
    });
    if (!isDelivered) {
      throw new Error("Legacy local backup delivery failed");
    }
  }

  async function uploadPendingLegacyCloudData() {
    if (
      !isLegacyCloudUploadPending ||
      isLegacyCloudUploadInProgress ||
      get(nucleumDatafnStatus).nucleumMode !== "sync"
    ) {
      return;
    }
    isLegacyCloudUploadInProgress = true;
    try {
      await cloneUpAllDatafnData();
      await completeLegacyLocalDataCloudUpload(get(appStore).product);
      isLegacyCloudUploadPending = false;
    } catch (error) {
      logger.error({ at: "uploadPendingLegacyCloudData", error });
    } finally {
      isLegacyCloudUploadInProgress = false;
    }
  }
  return {
    get mode() {
      return legacyRecoveryMode;
    },
    get error() {
      return legacyRecoveryError;
    },
    get summary() {
      return legacyLocalDataSummary;
    },
    get isCloudUploadPending() {
      return isLegacyCloudUploadPending;
    },
    prepare: prepareLegacyLocalDataRecoveryGate,
    importData: handleImportLegacyLocalData,
    downloadAndContinue: handleDownloadLegacyBackupAndContinue,
    uploadPendingCloudData: uploadPendingLegacyCloudData
  };
}
