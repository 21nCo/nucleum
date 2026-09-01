<script lang="ts">
  // import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
  import Button from "@21n/elements/button/Button.svelte";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import { fileStore } from "@21n/components/files/file.store";
  import { stringify } from "@21n/shared-utils/json.utils";
  async function exportData() {
    let response = ""; //await new PointronPersistence().exportData();
    if (response) {
      const data = stringify(response, { isPreventReplacer: true });
      const blob = new Blob([data], { type: "application/json" });
      fileStore.downloadFromBlob(blob, {
        fileName: `pointron_export_${parseAndFormatDate(new Date())}.json`,
        fileNameForEmbed: "pointron_export",
        contentType: "application/json",
        isHandleEmbedCase: true
      });
    }
  }
</script>

<span>
  <Button label="Export (Pointron json)" onclick={exportData} />
</span>
