<script lang="ts">
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import SettingsAsPageLayout from "@21n/components/settings/asPage/SettingsAsPageLayout.svelte";
  import ComponentResolver from "@21n/layout/paint/ComponentResolver.svelte";
  import { page } from "$app/stores";
  import view from "@21n/stores/view.store";
  import SettingsAsModal from "@21n/components/settings/SettingsAsModal.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { appStore } from "@21n/stores/app.store";
  import ComponentEmbedLayer from "@21n/layout/layers/ComponentEmbedLayer.svelte";
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
