<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import SettingsAsPageLayout from "./SettingsAsPageLayout.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { page } from "$app/stores";
  import view from "$lib/client/stores/view.store";
  import SettingsAsModal from "../SettingsAsModal.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  $: route = $page.url.searchParams.get(AppSearchParam.SETTING);
</script>

{#if $view.isConstrainedWidth}
  <SettingsAsPageLayout>
    {#if route}
      <ComponentResolver path={route} />
    {:else}
      <EmptyStatusView
        subText="Please select an option from the left panel to get started"
      />
    {/if}
  </SettingsAsPageLayout>
{:else}
  <SettingsAsModal />
{/if}
