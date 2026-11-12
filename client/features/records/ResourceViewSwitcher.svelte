<script lang="ts">
  import type { Snippet } from "svelte";
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
  import { withResourceActionKeys } from "@nucleum/features/records/resource-action-keys";
  import ContextActions from "@nucleum/shell/topNav/contextZone/ContextActions.svelte";
  import { determineResourceType } from "@nucleum/datafn/resource.utils";
  import {
    contextZone,
    isContextZoneAccessMode,
    isResourceInContextZone,
    nextCycleValue
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    resourceStore,
    panels,
    isConstrainedWidth = false,
    accessMode = undefined,
    onAction = undefined,
    isFloatingHidden = false,
    contextMenuResolver = undefined,
    title = undefined
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
    /** Replaces the context zone title while the tabs show there. */
    title?: Snippet;
  } = $props();

  const keyedMenuResolver = $derived(
    contextMenuResolver
      ? () => withResourceActionKeys(contextMenuResolver?.() ?? [])
      : undefined
  );
  const isContextZoneHosted = contextZone.isHosted;
  const isInContextZone = $derived(
    isResourceInContextZone($isContextZoneHosted, $view, accessMode)
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
    resolve={() => keyedMenuResolver?.() ?? []}
    {onAction}
    isEnabled={isContextZoneAccessMode(accessMode)}
  />
{/if}
{#if isInContextZone}
  <ContextZoneContent isInlineFallback={false} cycle={cyclePanel} {title}>
    <ResourcePanelSwitcher
      variant="tabs"
      {resourceStore}
      {panels}
      {isConstrainedWidth}
      {accessMode}
      {onAction}
      contextMenuResolver={keyedMenuResolver}
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
    contextMenuResolver={keyedMenuResolver}
  />
{/if}
