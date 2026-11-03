<script lang="ts">
  import { untrack } from "svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import AvatarRenderer from "@21n/ui/elements/avatarPicker/AvatarRenderer.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import SpaceWallGroup from "@nucleum/features/spaces/wall/SpaceWallGroup.svelte";
  import SpaceWallGrid from "@nucleum/features/spaces/wall/SpaceWallGrid.svelte";
  import type { ISpaceWallContext } from "@nucleum/features/spaces/wall/space-wall.type";
  import {
    countWallGroupResources,
    type ISpaceWallGroup
  } from "@nucleum/features/spaces/wall/space-wall.utils";

  let {
    group,
    depth = 0,
    wall
  }: {
    group: ISpaceWallGroup;
    depth?: number;
    wall: ISpaceWallContext;
  } = $props();

  let editLabel = $state("");
  let renameInput = $state<HTMLInputElement>();

  const section = $derived(group.section);
  const label = $derived(section.label || "Untitled section");
  const count = $derived(countWallGroupResources(group));
  const isEmpty = $derived(
    group.resources.length === 0 && group.groups.length === 0
  );
  const isEditing = $derived(
    wall.isEditMode && wall.editingSectionId === section.id
  );
  const isAddTarget = $derived(
    wall.isEditMode && wall.targetSectionId === section.id
  );

  $effect(() => {
    if (isEditing) {
      editLabel = untrack(() => section.label);
      renameInput?.focus();
      renameInput?.select();
    }
  });

  function saveLabel() {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== section.label)
      wall.onRename(section.id, trimmed);
    else wall.onCancelEdit();
  }

  function onRenameKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveLabel();
    } else if (event.key === "Escape") {
      event.preventDefault();
      wall.onCancelEdit();
    }
  }
</script>

<section
  class={cn("flex flex-col gap-3 min-w-0", {
    "pl-4 border-l-2 border-brs3": depth > 0
  })}
  aria-label={label}
  data-id={section.id}
  data-testid="space-wall-section"
  data-depth={depth}
>
  <div
    class={cn("flex items-center gap-2 min-w-0 rounded-md", {
      "bg-bgs2 px-2 py-1 -mx-2": isAddTarget
    })}
  >
    {#if section.avatar}
      <AvatarRenderer avatar={section.avatar} size={Size.sm} />
    {/if}
    {#if isEditing}
      <input
        bind:this={renameInput}
        bind:value={editLabel}
        class="flex-1 min-w-0 max-w-sm px-2 py-1 rounded-md bg-bgs1 border border-brs2 text-b1 outline-none focus:border-aps1"
        aria-label="Section name"
        onkeydown={onRenameKeydown}
        onblur={saveLabel}
      />
    {:else if wall.isEditMode}
      <button
        type="button"
        class={cn(
          "min-w-0 px-1 -mx-1 rounded-md text-left truncate hover:bg-bgs2-striped",
          {
            "text-h4 font-semibold": depth === 0,
            "text-b1 font-medium": depth > 0
          }
        )}
        aria-pressed={isAddTarget}
        title={isAddTarget ? "Adding new items here" : "Add new items here"}
        data-testid="space-wall-section-title"
        onclick={() => wall.onSelectSection(section.id)}
      >
        {label}
      </button>
    {:else}
      <h3
        class={cn("min-w-0 truncate", {
          "text-h4 font-semibold": depth === 0,
          "text-b1 font-medium": depth > 0
        })}
        data-testid="space-wall-section-title"
      >
        {label}
      </h3>
    {/if}
    {#if count > 0 && !isEditing}
      <span class="shrink-0 text-b3 text-fgs3">{count}</span>
    {/if}
    {#if wall.isEditMode && !isEditing}
      <div class="flex shrink-0 items-center ml-auto">
        <button
          type="button"
          class="p-1 rounded-md hover:bg-bgs3"
          aria-label={`Add section inside ${label}`}
          title="Add section inside"
          onclick={() => wall.onAddSection(section.id)}
        >
          <Icon icon="plus" size={Size.sm} class="stroke-fgs2" />
        </button>
        <button
          type="button"
          class="p-1 rounded-md hover:bg-bgs3"
          aria-label={`Rename ${label}`}
          title="Rename"
          onclick={() => wall.onStartEdit(section.id)}
        >
          <Icon icon="edit" size={Size.sm} class="stroke-fgs2" />
        </button>
        <button
          type="button"
          class="p-1 rounded-md hover:bg-bgs3"
          aria-label={`Delete ${label}`}
          title="Delete section"
          onclick={() => wall.onDelete(section, label)}
        >
          <Icon icon="trash" size={Size.sm} class="stroke-err" />
        </button>
      </div>
    {/if}
  </div>
  {#if isEmpty}
    <p class="text-b3 text-fgs3" data-testid="space-wall-empty-section">
      Empty section
    </p>
  {/if}
  {#if group.resources.length > 0}
    <SpaceWallGrid items={group.resources} {wall} />
  {/if}
  {#each group.groups as child (child.section.id)}
    <SpaceWallGroup group={child} depth={depth + 1} {wall} />
  {/each}
</section>
