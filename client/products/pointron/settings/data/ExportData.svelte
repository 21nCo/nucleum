<script lang="ts">
  import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
  import Button from "$lib/client/elements/button/Button.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { download } from "$lib/client/utils/utils";
  async function exportData() {
    let response = await new PointronPersistence().exportData();
    if (response) {
      const data = JSON.stringify(response);
      download(data, `pointron_export_${formatDate(new Date())}`);
    }
  }
</script>

{#if $context.embed === Embed.HANDSET || $context.embed === Embed.TABLET}
  <InlineInfoBanner
    content="We are sorry. Export feature is not currently available on mobile or tablet. Please use desktop or web app to export your data."
  />
{:else}
  <Button label="Export everything (json)" on:click={exportData} />
{/if}
