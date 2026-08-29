<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import { fileStore } from "@21n/components/files/file.store";
  import { stringify } from "@21n/shared-utils/json.utils";
  import { datafn, datafnRuntime } from "@21n/stores/datafn.store";
  import { toasts } from "@21n/stores/notification.store";
  import { ButtonVariant } from "@21n/types/button.type";
  import { pointronDatafnBackupResources } from "@21n/products/pointron/settings/data/pointronDatafnBackup.utils";
  import { logger } from "@21n/components/debug/logger.client";

  let isExporting = false;

  async function exportData() {
    if (isExporting) return;
    if (!$datafnRuntime?.storage) {
      toasts.error("Pointron export is not available in cloud direct mode");
      return;
    }
    isExporting = true;
    try {
      const response = await datafn.exportData({
        resources: pointronDatafnBackupResources
      });
      const data = stringify(response, { isPreventReplacer: true });
      const blob = new Blob([data], { type: "application/json" });
      fileStore.downloadFromBlob(blob, {
        fileName: `pointron-datafn-export-${parseAndFormatDate(new Date())}.json`,
        fileNameForEmbed: "pointron_export",
        contentType: "application/json",
        isHandleEmbedCase: true
      });
      toasts.success("Pointron data exported successfully");
    } catch (error) {
      logger.error({ at: "PointronExportData.exportData", error });
      toasts.error("Unable to export Pointron data");
    } finally {
      isExporting = false;
    }
  }
</script>

<span>
  <Button
    label="Export (Pointron JSON)"
    icon="download"
    type={ButtonVariant.PRIMARY}
    onclick={exportData}
    isLoading={isExporting}
    isDisabled={isExporting || !$datafnRuntime?.storage}
  />
</span>
