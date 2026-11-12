<script lang="ts">
  import PanelSwitcher from "@21n/ui/elements/switcher/PanelSwitcher.svelte";
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle
  } from "@21n/ui/elements/switcher/switcher.enum";
  import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { SpaceView } from "@nucleum/features/spaces/space.type";
  import type { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";
  import { resolveSpacePageMenu } from "@nucleum/features/spaces/space-page-menu";
  import { withResourceActionKeys } from "@nucleum/features/records/resource-action-keys";

  let {
    store,
    view,
    isPinned = false,
    onTogglePin,
    onViewChange
  }: {
    store: ActiveSpaceStore;
    view: SpaceView;
    isPinned?: boolean;
    onTogglePin: () => void;
    onViewChange: (view: SpaceView) => void;
  } = $props();

  const views = [
    { value: SpaceView.SIDENAV, label: "Side nav", icon: "sidebar" },
    { value: SpaceView.WALL, label: "Wall", icon: "widget" }
  ];

  function resolveMenu() {
    if (!$store) return [];
    return withResourceActionKeys(
      resolveSpacePageMenu($store, {
        isPinned,
        onRename: () => store.setTitleEditing(true),
        onTogglePin
      })
    );
  }
</script>

<div class="flex items-center h-full min-w-0" data-testid="space-context-zone">
  <div
    class="flex items-center h-full shrink-0 px-2"
    data-testid="space-view-switcher"
  >
    <PanelSwitcher
      style={PanelSwitcherStyle.TRAIN}
      items={views}
      value={view}
      size={Size.sm}
      parentBgIndex={0}
      isPreventTabShortcut={true}
      activeItemStrength={PanelSwitcherActiveItemStrength.SUBTLE}
      onSwitch={(event) => onViewChange(event.detail as SpaceView)}
    />
  </div>
  <div class="flex items-center h-full shrink-0">
    <ContextMenuAction
      id="spaceContextZoneMenu"
      testId="space-actions-menu"
      menuResolver={resolveMenu}
      size={Size.md}
      isBoxed={true}
      parentBgIndex={1}
      class="h-full w-10 app-framed:h-10 app-framed:rounded-[var(--app-control-radius)]"
      icon="more-outline-horizontal"
      heading="Space"
      tooltip="Space actions"
    />
  </div>
</div>
