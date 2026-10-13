<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import SettingsAsPageLayout from "@nucleum/surfaces/settings/asPage/SettingsAsPageLayout.svelte";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import { page } from "$app/stores";
  import view from "@21n/ui/environment/view.store";
  import SettingsAsModal from "@nucleum/surfaces/settings/SettingsAsModal.svelte";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

  import ComponentEmbedLayer from "@nucleum/shell/layers/ComponentEmbedLayer.svelte";
  const ComponentResolver = requireActionRenderer();
  const route = $derived($page.url.searchParams.get(AppSearchParam.SETTING));
  const backPath = $derived(
    $page.url.searchParams.get(AppSearchParam.RETURN_TO)
  );

  function handleBack() {
    if (backPath) navigation.gotoPath(backPath);
  }
</script>

{#if $view.isConstrainedWidth}
  <SettingsAsPageLayout
    isShowBackButton={backPath !== null}
    onBack={handleBack}
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
