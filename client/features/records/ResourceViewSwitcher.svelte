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
  import { isInPlaceResource } from "@nucleum/shared-state/resources/in-place-resource";
  import ContextActions from "@nucleum/shell/topNav/contextZone/ContextActions.svelte";
  import { determineResourceType } from "@nucleum/datafn/resource.utils";
  import {
    contextZone,
    isContextZoneAccessMode,
    isResourceInContextZone,
    getContextZonePane,
    type ContextZoneViews
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

  const isInPlace = isInPlaceResource();
  const isKeyedMenu = $derived(isContextZoneAccessMode(accessMode) || isInPlace);
  const keyedMenuResolver = $derived(
    contextMenuResolver && isKeyedMenu
      ? () => withResourceActionKeys(contextMenuResolver?.() ?? [])
      : contextMenuResolver
  );
  const isContextZoneHosted = contextZone.isHosted;
  const contextZoneEntryWidth = contextZone.entryWidth;
  const isInContextZone = $derived(
    isResourceInContextZone($isContextZoneHosted, $view, accessMode)
  );

  const views = $derived<ContextZoneViews>({
    values: panels.map((panel) => String(panel.value)),
    active: $resourceStore.panel,
    select: (value) => {
      if (value !== $resourceStore.panel) $resourceStore.switchPanel(value);
    }
  });
  const contextZonePane = getContextZonePane();

  $effect(() => {
    if (isInContextZone || panels.length < 2) return;
    return contextZone.registerViews(contextZonePane, {
      get views() {
        return views;
      }
    });
  });
</script>

{#if contextMenuResolver && $resourceStore.id}
  <ContextActions
    id={$resourceStore.id.toString()}
    resource={determineResourceType($resourceStore.id)}
    resolve={() => keyedMenuResolver?.() ?? []}
    {onAction}
    isEnabled={isKeyedMenu}
  />
{/if}
{#if isInContextZone}
  <ContextZoneContent isInlineFallback={false} {views} {title}>
    <ResourcePanelSwitcher
      variant="tabs"
      entryWidth={$contextZoneEntryWidth}
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
