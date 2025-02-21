<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType,
    ResourceAccessPointState
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import LibraryRecordsPane from "../LibraryRecordsPane.svelte";
  export let resource: Resource;

  let searchQuery: string = "";
  let arrangement: Arrangement =
    uiState.getResourceState(
      resource,
      ResourceAccessPoint.BROWSER,
      UIState.arrangement
    ) ?? Arrangement.LIST;

  $: multiSelectContext = {
    resource,
    accessPoint: ResourceAccessPoint.BROWSER
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);
  $: floatingButton =
    $multiSelectStore.length > 0
      ? undefined
      : {
          label: "Create new " + resource,
          callback: addAction,
          icon: "ph:plus-light",
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
</script>

<Panel {floatingButton} title={resource + "s"} isShowBackButton={true} on:back>
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
  <!-- <div class="flex h-full items-center" slot="toprightactions">
    <Button
      icon="ph:plus"
      label="New"
      isPreventMinWidth={true}
      size={Size.sm}
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.DEFAULT}
      on:click={addAction}
    />
  </div> -->
</Panel>
