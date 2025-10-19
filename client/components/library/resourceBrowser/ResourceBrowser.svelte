<script lang="ts">
  import Panel from "@21n/layout/paint/Panel.svelte";
  import { ButtonVariant } from "@21n/types/button.type";
  import { Arrangement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { appStore } from "@21n/stores/app.store";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { page } from "$app/stores";
  import ResourceResolver from "@21n/layout/paint/ResourceResolver.svelte";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType,
    ResourceAccessMode,
    ResourceAccessPointState
  } from "@21n/components/flux/resourceStores/resource.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { resolveMultiSelectStore } from "@21n/components/flux/resourceStores/resource.store";
  import { UIState } from "@21n/stores/uiState/uiState.type";
  import LibraryRecordsPane from "@21n/components/library/LibraryRecordsPane.svelte";
  import { isHideCreateAction, resolveResourceTooltip } from "@21n/components/library/library.utils";
  import { keyboardShortcuts } from "@21n/components/shortcuts/shortcuts.store";
  import ComponentShortcutListener from "@21n/components/shortcuts/ComponentShortcutListener.svelte";
  import ComponentEmbedLayer from "@21n/layout/layers/ComponentEmbedLayer.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import view from "@21n/stores/view.store";
  import { Display } from "@21n/types/view.type";
  export let resource: Resource;
  export let onBack: (() => void) | undefined = undefined;
  export let isPreventCwPadding: boolean = false;
  const backPath = $page.url.searchParams.get(AppSearchParam.RETURN_TO);
  const hasBack = onBack !== undefined || backPath !== null;

  let searchQuery: string = "";
  let id: string | null = null;
  let arrangement: Arrangement = resolveArrangement();

  const createShortcut = keyboardShortcuts?.resolveShortcutForAction("create");

  $: tooltip = resolveResourceTooltip(resource);
  $: id = $page.url.searchParams.get(ResourceAccessMode.INLINE);
  $: multiSelectContext = {
    resource,
    accessPoint: ResourceAccessPoint.BROWSER
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);
  $: floatingButton =
    $multiSelectStore.length > 0 || isHideCreateAction(resource)
      ? undefined
      : {
          label: "New " + resource,
          callback: addAction,
          icon: "plus",
          shortcut: createShortcut,
          variant: ButtonVariant.PRIMARY
        };

  $: state = isValidString(searchQuery)
    ? ResourceAccessPointState.SEARCH
    : ResourceAccessPointState.DEFAULT;

  let recordsPaneRef: LibraryRecordsPane | null = null;

  function resolveArrangement() {
    return (
      uiState?.getResourceState(
        resource,
        ResourceAccessPoint.BROWSER,
        UIState.arrangement
      ) ?? Arrangement.LIST
    );
  }

  const addAction = async () => {
    appStore.runAction(resourceAction(resource, ResourceActionType.CREATE), {
      componentParams: {
        context: ResourceAccessPoint.BROWSER
      }
    });
  };

  function determineExpansionType(resource: Resource) {
    if (resource === Resource.relation) return true;
    return false;
  }

  function determineSize(resource: Resource) {
    if (resource === Resource.task) return Size.xl;
    else if ($view.display === Display.TP) return Size.sm;
    return Size.md;
  }
</script>

{#key resource}
  <Panel
    floatingButton={hasBack && resource === Resource.node
      ? undefined
      : floatingButton}
    title={resource + "s"}
    isExpanded={determineExpansionType(resource)}
    on:back={() => {
      if (onBack) onBack();
      else if (backPath) appStore.gotoPath(backPath);
    }}
    info={tooltip ? { body: tooltip } : undefined}
    isShowBackButton={hasBack}
    panelSize={determineSize(resource)}
    {isPreventCwPadding}
  >
    <div
      class="relative flex flex-col gap-4 h-full overflow-auto py-3"
      slot="nonpadded"
    >
      <LibraryRecordsPane
        {resource}
        {arrangement}
        accessPoint={ResourceAccessPoint.BROWSER}
        accessPointState={state}
        bind:this={recordsPaneRef}
        isConstrainedWidth={true}
      />
    </div>
    <slot slot="right" name="right">
      {#key id}
        {#if id}
          <ResourceResolver {id} accessMode={ResourceAccessMode.INLINE} />
        {:else}
          <EmptyStatusView
            size={Size.lg}
            mainText="Nothing selected."
            subText={`Please select a ${resource} to view it here.`}
          />
        {/if}
      {/key}
    </slot>
  </Panel>
{/key}

{#if createShortcut}
  <ComponentShortcutListener
    shortcuts={[
      {
        shortcut: createShortcut,
        callback: addAction
      }
    ]}
  />
{/if}
<ComponentEmbedLayer isBackNavigable={true} />
