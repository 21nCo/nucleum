<script lang="ts">
  import BoxSwitcher from "@21n/ui/elements/switcher/BoxSwitcher.svelte";
  import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import type { ContextZoneSlot } from "@nucleum/shell/topNav/contextZone/context-zone";
  import { SpaceView } from "@nucleum/features/spaces/space.type";
  import type { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";

  let {
    store,
    itemSlot,
    view,
    parentLabel = undefined,
    isPinned = false,
    onBack = undefined,
    onTogglePin,
    onViewChange
  }: {
    store: ActiveSpaceStore;
    /** Context-zone controls of the item rendered inside the space. */
    itemSlot: ContextZoneSlot;
    view: SpaceView;
    /** Name of the space one level up, when this space is focused inside another. */
    parentLabel?: string;
    isPinned?: boolean;
    onBack?: () => void;
    onTogglePin: () => void;
    onViewChange: (view: SpaceView) => void;
  } = $props();

  const views = [
    { value: SpaceView.SIDENAV, label: "Side nav", icon: "sidebar" },
    { value: SpaceView.WALL, label: "Wall", icon: "widget" }
  ];
  const itemEntries = itemSlot.entries;
  const title = $derived($store?.label || "Untitled space");
  const backLabel = $derived(parentLabel || "Untitled space");

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
  {#if onBack && parentLabel !== undefined}
    <div class="flex items-center h-full min-w-0 shrink pr-1 gap-0.5">
      {#key backLabel}
        <button
          type="button"
          class="flex items-center justify-center h-8 w-8 shrink-0 rounded-md text-fgs3 hover:bg-bgs3 hover:text-fgs1"
          aria-label={`Back to ${backLabel}`}
          data-testid="space-back"
          use:tooltip={{ text: `Back to ${backLabel}` }}
          onclick={onBack}
        >
          <Icon icon="chevron-left" size={Size.sm} />
        </button>
      {/key}
      <span
        class="truncate max-w-[12rem] px-1 text-b2 text-fgs1"
        data-testid="space-focused-title">{title}</span
      >
    </div>
  {/if}
  <div class="h-full shrink-0" data-testid="space-view-switcher">
    <BoxSwitcher
      isTablist={true}
      options={views}
      selected={view}
      size={Size.md}
      onSelect={(event) => onViewChange(event.detail as SpaceView)}
    />
  </div>
  <div class="flex items-center h-full shrink-0">
    <ContextMenuAction
      id="spaceContextZoneMenu"
      testId="space-actions-menu"
      menuResolver={resolveMenu}
      size={Size.md}
      isBoxed={true}
      parentBgIndex={2}
      class="h-full w-10"
      icon="more-outline-horizontal"
      heading="Space"
      tooltip="Space actions"
    />
  </div>
  {#each $itemEntries as entry (entry.key)}
    <div
      class="shrink-0 w-px h-5 mx-1 bg-brs3"
      aria-hidden="true"
      data-testid="space-item-divider"
    ></div>
    <div class="flex items-center h-full min-w-0" data-testid="space-item-tabs">
      {@render entry.content()}
    </div>
  {/each}
</div>
