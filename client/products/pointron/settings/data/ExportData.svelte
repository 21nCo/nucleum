<script lang="ts">
  import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { downloadJson } from "$lib/client/utils/utils";
  async function exportData() {
    let response = await new PointronPersistence().exportData();
    if (response) {
      const data = JSON.stringify(response);
      downloadJson(data, `pointron_export_${formatDate(new Date())}`);
    }
  }
</script>

<span>
  <Button label="Export (Pointron json)" on:click={exportData} />
</span>
