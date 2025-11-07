<script lang="ts">
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import {
    resolveNodeContextMenu,
    resolvePanelOptions,
    type IActiveNodeStore
  } from "../node.store";
  import ResourcePanelSwitcher from "@21n/components/resource/ResourcePanelSwitcher.svelte";
  import { derived } from "svelte/store";
  import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
  export let node: IActiveNodeStore;
  export let isConstrainedWidth: boolean = false;

  $: isReadOnlyMode =
    $node.isInReadOnlyMode ||
    $node.isLocked ||
    $node.isArchived ||
    $node.trashInformation !== undefined;

  const adaptedStore = derived(node, ($node) => ({
    id: $node.id,
    panel: $node.panel,
    isInFocusMode: $node.isInFocusMode,
    switchPanel: (panel: string) => node.switchPanel(panel)
  }));

  function onContextMenuAction(
    e: CustomEvent<ResourcePanelType | ResourceActionType>
  ) {
    if (
      [
        ResourcePanelType.METADATA,
        ResourcePanelType.ACTIVITY,
        ResourcePanelType.SIDENOTES,
        ResourcePanelType.PROPERTIES,
        ResourcePanelType.BOOKMARKS,
        ResourcePanelType.LINKS
      ].includes(e.detail)
    ) {
      node.switchPanel(e.detail);
    } else if (e.detail === ResourceActionType.SET_COVER_PHOTO) {
      if (!isReadOnlyMode) {
        node.toggleCoverPicker(true);
      }
    }
  }

  $: panels = resolvePanelOptions($node);
</script>

<ResourcePanelSwitcher
  resourceStore={adaptedStore}
  {panels}
  {isConstrainedWidth}
  accessMode={$node.accessMode}
  contextMenuResolver={() =>
    resolveNodeContextMenu($node, ResourceAccessPoint.SELF, {
      accessMode: $node.accessMode,
      isConstrainedWidth
    })}
  on:action={onContextMenuAction}
/>
