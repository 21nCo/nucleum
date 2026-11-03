<script lang="ts">
  import type { Readable } from "svelte/store";
  import type { IToggleItem } from "@21n/ui/elements/toggle/toggle.type";
  import type { IContextMenuItem } from "@21n/ui/elements/contextMenu/context-menu.type";
  import type {
    AccessMode,
    IResourcePageWithPanels
  } from "@nucleum/datafn/resource.type";
  import view from "@21n/ui/environment/view.store";
  import ResourcePanelSwitcher from "@nucleum/features/records/ResourcePanelSwitcher.svelte";
  import ContextZoneContent from "@nucleum/shell/topNav/contextZone/ContextZoneContent.svelte";
  import ContextActions from "@nucleum/shell/topNav/contextZone/ContextActions.svelte";
  import { determineResourceType } from "@nucleum/datafn/resource.utils";
  import {
    contextZone,
    getContextZoneTarget,
    isContextZoneAccessMode,
    nextCycleValue
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    resourceStore,
    panels,
    isConstrainedWidth = false,
    accessMode = undefined,
    onAction = undefined,
    isFloatingHidden = false,
    contextMenuResolver = undefined
  }: {
    resourceStore: Readable<IResourcePageWithPanels>;
    panels: IToggleItem[];
    isConstrainedWidth?: boolean;
    accessMode?: AccessMode;
    onAction?: ((detail: IContextMenuItem["value"]) => void) | undefined;
    /** Hides the floating bar, such as while the content scrolls down. */
    isFloatingHidden?: boolean;
    contextMenuResolver?:
      | (() =>
          | {
              group: string;
              items: IContextMenuItem[];
            }[]
          | undefined)
      | undefined;
  } = $props();

  const isContextZoneHosted = contextZone.isHosted;
  const isInPlaceInContextZone = !!getContextZoneTarget();
  const isZoneAccess = $derived(
    isContextZoneAccessMode(accessMode) || isInPlaceInContextZone
  );
  const isInContextZone = $derived(
    $isContextZoneHosted &&
      !$view.isConstrainedWidth &&
      !$view.isPortrait &&
      isZoneAccess
  );

  function cyclePanel() {
    const next = nextCycleValue(
      panels.map((panel) => panel.value),
      $resourceStore.panel
    );
    if (next !== undefined) $resourceStore.switchPanel(next);
  }
</script>

{#if contextMenuResolver && $resourceStore.id}
  <ContextActions
    id={$resourceStore.id.toString()}
    resource={determineResourceType($resourceStore.id)}
    resolve={() => contextMenuResolver?.() ?? []}
    {onAction}
    isEnabled={isZoneAccess}
  />
{/if}
{#if isInContextZone}
  <ContextZoneContent isInlineFallback={false} cycle={cyclePanel}>
    <ResourcePanelSwitcher
      variant="tabs"
      {resourceStore}
      {panels}
      {isConstrainedWidth}
      {accessMode}
      {onAction}
      {contextMenuResolver}
    />
  </ContextZoneContent>
  <ResourcePanelSwitcher
    variant="edit-bar"
    {resourceStore}
    {panels}
    {accessMode}
  />
{:else}
  <ResourcePanelSwitcher
    {resourceStore}
    {panels}
    {isConstrainedWidth}
    {accessMode}
    {onAction}
    {isFloatingHidden}
    {contextMenuResolver}
  />
{/if}
