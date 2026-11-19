<script lang="ts" module>
  import { SpaceView } from "@nucleum/features/spaces/space.type";

  /** Space layouts in menu order, which the view keys follow too. */
  export const SPACE_VIEW_OPTIONS = [
    { value: SpaceView.SIDENAV, label: "Side nav", icon: "sidebar" },
    { value: SpaceView.WALL, label: "Wall", icon: "widget" }
  ];
</script>

<script lang="ts">
  import type { IContextMenu } from "@21n/ui/elements/contextMenu/context-menu.type";
  import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import type { ISelectValue } from "@21n/ui/elements/select/select.type";
  import type { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";
  import { resolveKeyedSpacePageMenu } from "@nucleum/features/spaces/space-page-menu";

  let {
    store,
    view,
    isPinned = false,
    onTogglePin,
    onViewChange,
    isKeyed = true
  }: {
    store: ActiveSpaceStore;
    view: SpaceView;
    isPinned?: boolean;
    onTogglePin: () => void;
    onViewChange: (view: SpaceView) => void;
    /** Whether the space's single-key letters apply, shown in its menu. */
    isKeyed?: boolean;
  } = $props();

  function resolveMenu(): IContextMenu {
    const viewGroup = {
      group: "view",
      items: [],
      option: {
        label: "View",
        options: SPACE_VIEW_OPTIONS,
        value: view,
        onChange: (value: ISelectValue) => onViewChange(value as SpaceView)
      }
    };
    if (!$store) return [viewGroup];
    return [
      viewGroup,
      ...resolveKeyedSpacePageMenu($store, {
        isKeyed,
        isPinned,
        onRename: () => store.setTitleEditing(true),
        onTogglePin,
        onChanged: () => store.init(undefined, { isRecordedInRecents: false })
      })
    ];
  }
</script>

<div class="flex items-center h-full min-w-0" data-testid="space-context-zone">
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
