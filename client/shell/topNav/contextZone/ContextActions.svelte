<svelte:options runes={true} />

<script lang="ts">
  import type {
    IContextMenu,
    IContextMenuItem
  } from "@21n/ui/elements/contextMenu/context-menu.type";
  import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
  import { getContextZonePane } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    id,
    resource,
    resolve,
    onAction = undefined,
    isEnabled = true
  }: {
    /** Record id of the resource the actions apply to. */
    id: string;
    /** Resource type label shown in the super bar group heading. */
    resource: string;
    /** Resolves the same groups as the resource's "..." menu. */
    resolve: () => IContextMenu;
    /** Receives the item value after an item runs. */
    onAction?: (value: IContextMenuItem["value"]) => void;
    /** Registers only while the resource is shown as a page or split. */
    isEnabled?: boolean;
  } = $props();

  const pane = getContextZonePane();

  $effect(() => {
    if (!isEnabled || !id) return;
    return contextActions.register(pane, {
      get id() {
        return id;
      },
      get resource() {
        return resource;
      },
      get resolve() {
        return resolve;
      },
      get onAction() {
        return onAction;
      }
    });
  });
</script>
