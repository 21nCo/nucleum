<script lang="ts">
  import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { fileStore } from "$lib/client/components/files/file.store";
  async function exportData() {
    let response = await new PointronPersistence().exportData();
    if (response) {
      const data = JSON.stringify(response);
      const blob = new Blob([data], { type: "application/json" });
      fileStore.downloadFromBlob(blob, {
        fileName: `pointron_export_${formatDate(new Date())}.json`,
        fileNameForEmbed: "pointron_export",
        contentType: "application/json",
        isHandleEmbedCase: true
      });
    }
  }
</script>

<span>
  <Button label="Export (Pointron json)" on:click={exportData} />
</span>
