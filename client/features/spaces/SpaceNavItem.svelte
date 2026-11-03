<script lang="ts">
  import { untrack } from "svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import AvatarRenderer from "@21n/ui/elements/avatarPicker/AvatarRenderer.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { resolveResourceIcon } from "@nucleum/datafn/resource.utils";
  import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
  import SpaceNavItem from "@nucleum/features/spaces/SpaceNavItem.svelte";
  import SpaceHeadingTree from "@nucleum/features/spaces/SpaceHeadingTree.svelte";
  import {
    SpaceNavItemType,
    type ISpaceNavItem,
    type ISpacePageNavItem,
    type ISpaceResourceNavItem,
    type SpaceDropPosition
  } from "@nucleum/features/spaces/space.type";
  import type { ISpaceNavContext } from "@nucleum/features/spaces/space-nav.type";
  import {
    isSpaceItemBlocked,
    resolveSpaceItemStatus,
    resolveSpacePageStatus,
    resolveTargetLabel
  } from "@nucleum/features/spaces/space.utils";
  import {
    openSpacePage,
    resolveOpenableSpacePage
  } from "@nucleum/features/spaces/space-page";

  let {
    item,
    depth = 0,
    nav
  }: {
    item: ISpaceNavItem;
    depth?: number;
    nav: ISpaceNavContext;
  } = $props();

  let editLabel = $state("");
  let dropPosition = $state<SpaceDropPosition | null>(null);
  let renameInput = $state<HTMLInputElement>();

  const isSection = $derived(item.type === SpaceNavItemType.SECTION);
  const resourceItem = $derived(
    item.type === SpaceNavItemType.RESOURCE
      ? (item as ISpaceResourceNavItem)
      : undefined
  );
  const pageItem = $derived(
    item.type === SpaceNavItemType.PAGE
      ? (item as ISpacePageNavItem)
      : undefined
  );
  const pageRoute = $derived(
    pageItem ? resolveOpenableSpacePage(pageItem.path) : undefined
  );
  const target = $derived(
    resourceItem ? nav.targets[resourceItem.resourceId.toString()] : undefined
  );
  const isMarkdownPage = $derived(
    resourceItem?.resourceType === Resource.node &&
      target?.contentType === NodeType.NODULAR_MARKDOWN
  );
  const isSubSpace = $derived(resourceItem?.resourceType === Resource.space);
  const isExpanded = $derived(
    isSection ? !nav.collapsedIds.has(item.id) : nav.expandedIds.has(item.id)
  );
  const isEditing = $derived(nav.isEditMode && nav.editingItemId === item.id);
  const isActive = $derived(nav.activeItemId === item.id);
  const isAddTarget = $derived(
    nav.isEditMode && isSection && nav.targetSectionId === item.id
  );
  const label = $derived(
    isSection
      ? item.label || "Untitled section"
      : pageItem
        ? pageRoute?.label || item.label || pageItem.path
        : (target ? resolveTargetLabel(target) : undefined) ||
          item.label ||
          "Untitled"
  );
  const avatar = $derived(target?.avatar ?? item.avatar);
  const status = $derived(
    pageItem
      ? resolveSpacePageStatus(pageRoute)
      : resourceItem
        ? resolveSpaceItemStatus({
            item: resourceItem,
            product: nav.product,
            target,
            isTargetsLoaded: nav.isTargetsLoaded,
            loopIds: nav.loopIds
          })
        : undefined
  );
  const isUnavailable = $derived(isSpaceItemBlocked(status));
  const hasHeadings = $derived(isMarkdownPage && !isUnavailable);
  const isExpandable = $derived(
    (isSection && (item.children?.length ?? 0) > 0) || hasHeadings
  );

  $effect(() => {
    if (isEditing) {
      editLabel = untrack(() => item.label);
      renameInput?.focus();
      renameInput?.select();
    }
  });

  function activate() {
    if (isSection) {
      nav.onSelectSection(item.id);
      return;
    }
    if (isUnavailable) return;
    if (pageItem) {
      void openSpacePage(pageItem);
      return;
    }
    if (!resourceItem) return;
    if (isSubSpace) nav.onFocusSpace(resourceItem);
    else nav.onOpen(resourceItem);
  }

  function onRowKeydown(event: KeyboardEvent) {
    if (!nav.isEditMode || !event.altKey) return;
    const moves: Record<string, "up" | "down" | "indent" | "outdent"> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowRight: "indent",
      ArrowLeft: "outdent"
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    nav.onKeyboardMove(item.id, move);
  }

  function saveLabel() {
    if (!isEditing) return;
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== item.label) nav.onRename(item.id, trimmed);
    else nav.onCancelEdit();
  }

  function onRenameKeydown(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      saveLabel();
    } else if (event.key === "Escape") {
      event.preventDefault();
      nav.onCancelEdit();
    }
  }

  function handleDragStart(event: DragEvent) {
    if (!nav.isEditMode || isEditing) return;
    event.stopPropagation();
    event.dataTransfer?.setData("text/plain", item.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    nav.onDragStart(item.id);
  }

  function handleDragEnd(event: DragEvent) {
    event.stopPropagation();
    dropPosition = null;
    nav.onDragEnd();
  }

  function resolveDropPosition(event: DragEvent): SpaceDropPosition {
    const element = event.currentTarget as HTMLElement;
    const { top, height } = element.getBoundingClientRect();
    const offset = event.clientY - top;
    if (!isSection) return offset < height / 2 ? "before" : "after";
    if (offset < height / 4) return "before";
    if (offset > (height * 3) / 4) return "after";
    return "inside";
  }

  function canAcceptDrop() {
    return (
      nav.isEditMode &&
      Boolean(nav.draggedItemId) &&
      nav.draggedItemId !== item.id
    );
  }

  function handleDragOver(event: DragEvent) {
    if (!canAcceptDrop()) return;
    event.preventDefault();
    event.stopPropagation();
    dropPosition = resolveDropPosition(event);
  }

  function handleDragLeave(event: DragEvent) {
    const related = event.relatedTarget as Node | null;
    if (
      !(event.currentTarget instanceof HTMLElement) ||
      !related ||
      !event.currentTarget.contains(related)
    ) {
      dropPosition = null;
    }
  }

  function handleDrop(event: DragEvent) {
    if (!canAcceptDrop()) return;
    event.preventDefault();
    event.stopPropagation();
    const position = dropPosition ?? resolveDropPosition(event);
    dropPosition = null;
    nav.onDrop({ itemId: nav.draggedItemId!, targetId: item.id, position });
  }
</script>

<li
  class="flex flex-col w-full"
  data-id={item.id}
  data-testid="space-nav-item"
  data-item-type={item.type}
>
  <div
    class={cn(
      "group relative flex items-center gap-1 pr-1 py-1 border-y transition-colors",
      {
        "bg-bgs2 border-brs2": isActive || isAddTarget,
        "border-transparent hover:bg-bgs2-striped": !isActive && !isAddTarget,
        "opacity-50": nav.draggedItemId === item.id,
        "border-t-aps1": dropPosition === "before",
        "border-b-aps1": dropPosition === "after",
        "bg-aps3/40": dropPosition === "inside"
      }
    )}
    style:padding-left={`${Math.min(depth * 1, 5) + 0.25}rem`}
    role="presentation"
    draggable={nav.isEditMode && !isEditing}
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    {#if isExpandable}
      <button
        type="button"
        class="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-bgs3"
        aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
        aria-expanded={isExpanded}
        onclick={() => nav.onToggle(item.id, isSection)}
      >
        <Icon
          icon={isExpanded ? "chevron-down" : "chevron-right"}
          class="stroke-fgs2"
          size={Size.sm}
        />
      </button>
    {:else}
      <span class="w-6 shrink-0"></span>
    {/if}
    {#if isEditing}
      <input
        bind:this={renameInput}
        bind:value={editLabel}
        class="flex-1 min-w-0 px-2 py-1 rounded-md bg-bgs1 border border-brs2 text-b2 outline-none focus:border-aps1"
        aria-label="Section name"
        onkeydown={onRenameKeydown}
        onblur={saveLabel}
      />
    {:else}
      <button
        type="button"
        class={cn(
          "flex flex-1 min-w-0 items-center gap-2 px-1 py-1 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-aps1",
          {
            "cursor-not-allowed": isUnavailable,
            "font-medium": isSection
          }
        )}
        data-role="space-item-main"
        aria-current={isActive ? "true" : undefined}
        aria-disabled={isUnavailable ? "true" : undefined}
        title={status?.text}
        onclick={activate}
        onkeydown={onRowKeydown}
      >
        <span
          class={cn("flex w-5 h-5 shrink-0 items-center justify-center", {
            "opacity-50": Boolean(status)
          })}
        >
          {#if avatar}
            <AvatarRenderer {avatar} size={Size.sm} />
          {:else}
            <Icon
              icon={isSection
                ? "folder"
                : pageItem
                  ? (pageRoute?.action.icon ?? "link")
                  : resolveResourceIcon(resourceItem!.resourceType)}
              size={Size.sm}
              class="stroke-fgs2"
            />
          {/if}
        </span>
        <span
          class={cn("truncate text-b2", {
            "text-fgs3": Boolean(status),
            "line-through": status?.kind === "trashed"
          })}
        >
          {label}
        </span>
        {#if status}
          <span class="ml-auto shrink-0 text-b4 text-fgs3">{status.text}</span>
        {:else if isSubSpace}
          <Icon
            icon="chevron-right"
            size={Size.xs}
            class="ml-auto shrink-0 stroke-fgs3"
          />
        {:else if isSection && item.children?.length}
          <span class="ml-auto shrink-0 text-b3 text-fgs3">
            {item.children.length}
          </span>
        {/if}
      </button>
    {/if}
    {#if nav.isEditMode && !isEditing}
      <div class="flex shrink-0 items-center">
        {#if isSection}
          <button
            type="button"
            class="p-1 rounded-md hover:bg-bgs3"
            aria-label={`Add section inside ${label}`}
            title="Add section inside"
            onclick={() => nav.onAddSection(item.id)}
          >
            <Icon icon="plus" size={Size.sm} class="stroke-fgs2" />
          </button>
          <button
            type="button"
            class="p-1 rounded-md hover:bg-bgs3"
            aria-label={`Rename ${label}`}
            title="Rename"
            onclick={() => nav.onStartEdit(item.id)}
          >
            <Icon icon="edit" size={Size.sm} class="stroke-fgs2" />
          </button>
        {/if}
        <button
          type="button"
          class="p-1 rounded-md hover:bg-bgs3"
          aria-label={isSection ? `Delete ${label}` : `Remove ${label}`}
          title={isSection ? "Delete section" : "Remove from space"}
          onclick={() => nav.onDelete(item, label)}
        >
          <Icon icon="trash" size={Size.sm} class="stroke-ars1" />
        </button>
      </div>
    {/if}
  </div>
  {#if isSection && isExpanded && item.children?.length}
    <ul class="flex flex-col">
      {#each item.children as child (child.id)}
        <SpaceNavItem item={child} depth={depth + 1} {nav} />
      {/each}
    </ul>
  {:else if hasHeadings && isExpanded && resourceItem}
    <SpaceHeadingTree
      nodeId={resourceItem.resourceId.toString()}
      depth={depth + 1}
      activeHeadingId={isActive ? nav.activeHeadingId : undefined}
      onSelect={(headingId) => nav.onOpenHeading(resourceItem, headingId)}
    />
  {/if}
</li>
