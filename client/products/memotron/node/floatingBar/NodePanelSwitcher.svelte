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
  import type { ISelectValue } from "@21n/types/select.type";
  let {
    node,
    isConstrainedWidth = false
  }: {
    node: IActiveNodeStore;
    isConstrainedWidth?: boolean;
  } = $props();

  let isReadOnlyMode = $derived(
    $node.isInReadOnlyMode ||
      $node.isLocked ||
      $node.isArchived ||
      $node.trashInformation !== undefined
  );

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

  function onContextMenuAction(detail: ISelectValue) {
    if (panelTypes.has(detail as ResourcePanelType)) {
      node.switchPanel(detail as ResourcePanelType);
    } else if (detail === ResourceActionType.SET_COVER_PHOTO) {
      if (!isReadOnlyMode) {
        node.toggleCoverPicker(true);
      }
    }
  }

  let panels = $derived(resolvePanelOptions($node));
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
  onAction={onContextMenuAction}
/>
