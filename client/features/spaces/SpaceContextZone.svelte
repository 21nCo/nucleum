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
    return [
      {
        group: "space",
        items: [
          {
            value: "rename",
            label: "Rename",
            icon: "edit",
            callback: async () => store.setTitleEditing(true)
          },
          {
            value: "pin",
            label: isPinned ? "Unpin from app menu" : "Pin to app menu",
            icon: isPinned ? "unpin" : "pin",
            callback: async () => onTogglePin()
          }
        ]
      }
    ];
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
      class="h-full w-10"
      icon="more-outline-horizontal"
      heading="Space"
      tooltip="Space actions"
    />
  </div>
</div>
