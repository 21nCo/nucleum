<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import SettingsAsPageLayout from "./SettingsAsPageLayout.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { page } from "$app/stores";
  $: route = $page.url.searchParams.get("setting");
</script>

<SettingsAsPageLayout>
  {#if route}
    <ComponentResolver path={route} />
  {:else}
    <EmptyStatusView
      subText="Please select an option from the left panel to get started"
    />
  {/if}
</SettingsAsPageLayout>
