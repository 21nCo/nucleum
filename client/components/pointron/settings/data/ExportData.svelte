<script lang="ts">
  import { LocalPersistance } from "$lib/client/components/pointron/local.persistance";
  import Button from "$lib/client/elements/button/Button.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { LaunchContext } from "$lib/client/types/appStore.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { download } from "$lib/client/utils/utils";
  async function exportData() {
    let response = await new LocalPersistance().exportData();
    if (response) {
      const data = JSON.stringify(response);
      download(data, `pointron_export_${formatDate(new Date())}`);
    }
  }
</script>

{#if $appStore.launchContext === LaunchContext.EMBED}
  <InlineInfoBanner
    content="We are sorry. Export feature is not currently available on mobile. Please use desktop or web app to export your data."
  />
{:else}
  <Button label="Export everything (json)" on:click={exportData} />
{/if}
