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
  import type { IResourcePageWithPanels } from "@21n/components/flux/resourceStores/resource.type";
  export let node: IActiveNodeStore;
  export let isConstrainedWidth: boolean = false;

  $: isReadOnlyMode =
    $node.isInReadOnlyMode ||
    $node.isLocked ||
    $node.isArchived ||
    $node.trashInformation !== undefined;

  const panelTypes = new Set<ResourcePanelType>([
    ResourcePanelType.METADATA,
    ResourcePanelType.ACTIVITY,
    ResourcePanelType.SIDENOTES,
    ResourcePanelType.PROPERTIES,
    ResourcePanelType.BOOKMARKS,
    ResourcePanelType.LINKS
  ]);

  const adaptedStore = derived(node, ($node): IResourcePageWithPanels => ({
    id: $node.id,
    panel: $node.panel,
    defaultPanel: $node.defaultPanel ?? ResourcePanelType.DEFAULT,
    isInFocusMode: $node.isInFocusMode,
    isInEditMode: $node.isInEditMode,
    switchPanel: (panel?: string) =>
      node.switchPanel(panel ?? $node.defaultPanel ?? ResourcePanelType.DEFAULT),
    closeEditMode: () => node.toggleEditMode(false)
  }));

  function onContextMenuAction(
    e: CustomEvent<ResourcePanelType | ResourceActionType>
  ) {
    if (panelTypes.has(e.detail as ResourcePanelType)) {
      node.switchPanel(e.detail as ResourcePanelType);
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
