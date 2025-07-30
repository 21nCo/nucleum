<script lang="ts">
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { page } from "$app/stores";
  import ResourceResolver from "$lib/client/layout/paint/ResourceResolver.svelte";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType,
    ResourceAccessMode,
    ResourceAccessPointState
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import LibraryRecordsPane from "../LibraryRecordsPane.svelte";
  import { isHideCreateAction, resolveResourceTooltip } from "../library.utils";
  import { keyboardShortcuts } from "../../shortcuts/shortcuts.store";
  import ComponentShortcutListener from "../../shortcuts/ComponentShortcutListener.svelte";
  export let resource: Resource;
  export let isLibraryNavContext: boolean = false;
  let searchQuery: string = "";
  let id: string | null = null;
  let arrangement: Arrangement =
    uiState?.getResourceState(
      resource,
      ResourceAccessPoint.BROWSER,
      UIState.arrangement
    ) ?? Arrangement.LIST;
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
    return Size.md;
  }
</script>

{#key resource}
  <Panel
    {floatingButton}
    title={resource + "s"}
    isExpanded={determineExpansionType(resource)}
    on:back
    info={tooltip ? { body: tooltip } : undefined}
    isShowBackButton={isLibraryNavContext}
    panelSize={determineSize(resource)}
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
