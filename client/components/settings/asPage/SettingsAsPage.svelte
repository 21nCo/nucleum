<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import SettingsAsPageLayout from "./SettingsAsPageLayout.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { page } from "$app/stores";
  import view from "$lib/client/stores/view.store";
  import SettingsAsModal from "../SettingsAsModal.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { appStore } from "$lib/client/stores/app.store";
  import ComponentEmbedLayer from "$lib/client/layout/layers/ComponentEmbedLayer.svelte";
  $: route = $page.url.searchParams.get(AppSearchParam.SETTING);
  const backPath = $page.url.searchParams.get(AppSearchParam.RETURN_TO);
</script>

{#if $view.isConstrainedWidth}
  <SettingsAsPageLayout
    isShowBackButton={backPath !== null}
    on:back={() => {
      if (backPath) appStore.gotoPath(backPath);
    }}
  >
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
<ComponentEmbedLayer isBackNavigable={true} />
