<script lang="ts">
  import { tick, untrack } from "svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import AvatarRenderer from "@21n/ui/elements/avatarPicker/AvatarRenderer.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import { SpaceView } from "@nucleum/features/spaces/space.type";
  import type { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";

  let {
    store,
    titleStore = undefined,
    parentLabel = undefined,
    view,
    isPinned = false,
    isCompact = false,
    onBack = undefined,
    onTogglePin,
    onViewChange
  }: {
    store: ActiveSpaceStore;
    /**
     * Space the compact rename input edits: the space the context zone names,
     * which is the root space while a sub space is focused. Defaults to `store`.
     */
    titleStore?: ActiveSpaceStore;
    /** Name of the space one level up; shows the back button when set. */
    parentLabel?: string;
    /** Layout shown for this space; inside a focus chain it comes from the root space. */
    view: SpaceView;
    isPinned?: boolean;
    /**
     * Leaves the name, the view switcher and pinning to the top bar context
     * zone; keeps the item tools and the name input while renaming.
     */
    isCompact?: boolean;
    onBack?: () => void;
    onTogglePin: () => void;
    onViewChange: (view: SpaceView) => void;
  } = $props();

  const views = [
    { value: SpaceView.SIDENAV, label: "Side nav", icon: "sidebar" },
    { value: SpaceView.WALL, label: "Wall", icon: "widget" }
  ];

  let titleInput = $state<HTMLInputElement>();
  let draftTitle = $state("");
  const space = $derived($store);
  const editedStore = $derived(isCompact && titleStore ? titleStore : store);
  const editedSpace = $derived($editedStore);
  const title = $derived(space?.label || "Untitled space");
  const isEditMode = $derived(Boolean(space?.isInEditMode));
  const isTitleEditing = $derived(Boolean(editedSpace?.isTitleEditing));
  const isFocusedTitleEditing = $derived(
    isTitleEditing && editedStore === store
  );

  $effect(() => {
    if (isTitleEditing && titleInput) {
      const input = titleInput;
      draftTitle = untrack(() => editedSpace?.label ?? "");
      tick().then(() => {
        input.focus();
        input.select();
      });
    }
  });

  function saveTitle() {
    if (!isTitleEditing) return;
    const target = editedStore;
    const trimmed = draftTitle.trim();
    target.setTitleEditing(false);
    if (trimmed !== (editedSpace?.label ?? "")) target.updateLabel(trimmed);
  }

  function onTitleKeydown(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      saveTitle();
    } else if (event.key === "Escape") {
      event.preventDefault();
      editedStore.setTitleEditing(false);
    }
  }
</script>

{#snippet editButton()}
  <button
    type="button"
    class={cn("p-1.5 rounded-md", {
      "bg-aps3 text-aps1": isEditMode,
      "hover:bg-bgs2-striped": !isEditMode
    })}
    aria-pressed={isEditMode}
    aria-label="Edit items"
    title={isEditMode ? "Done" : "Edit items"}
    data-testid="space-edit"
    onclick={() => store.setEditMode(!isEditMode)}
  >
    <Icon
      icon={isEditMode ? "check" : "edit"}
      size={Size.sm}
      class="stroke-fgs2"
    />
  </button>
{/snippet}

{#if isCompact}
  <header
    class="flex flex-col gap-2 px-3 pt-2 w-full"
    data-testid="space-header"
  >
    {#if isTitleEditing}
      <div class="flex items-center gap-2 min-w-0">
        <input
          bind:this={titleInput}
          bind:value={draftTitle}
          class="flex-1 min-w-0 px-2 py-1 rounded-md border border-brs2 bg-bgs1 text-h4 font-semibold outline-none focus:border-aps1"
          placeholder="Untitled space"
          aria-label="Space name"
          data-testid="space-title-input"
          onkeydown={onTitleKeydown}
          onblur={saveTitle}
        />
      </div>
    {/if}
    <div class="flex items-center gap-1 min-w-0">
      {#if onBack && parentLabel !== undefined}
        <button
          type="button"
          class="flex items-center justify-center h-7 w-7 shrink-0 rounded-md text-fgs3 hover:bg-bgs2-striped hover:text-fgs1"
          aria-label={`Back to ${parentLabel || "Untitled space"}`}
          title={`Back to ${parentLabel || "Untitled space"}`}
          data-testid="space-back"
          onclick={onBack}
        >
          <Icon icon="chevron-left" size={Size.sm} class="stroke-current" />
        </button>
        {#if !isFocusedTitleEditing}
          <span
            class="flex-1 min-w-0 truncate px-1 text-b2 font-medium text-fgs1"
            data-testid="space-focused-title">{title}</span
          >
        {:else}
          <span class="flex-1"></span>
        {/if}
      {:else}
        <span class="flex-1 px-1 text-b3 text-fgs3">Items</span>
      {/if}
      {@render editButton()}
    </div>
  </header>
{:else}
  <header
    class="flex flex-col gap-2 px-3 pt-3 w-full"
    data-testid="space-header"
  >
    {#if onBack && parentLabel !== undefined}
      <button
        type="button"
        class="flex items-center gap-1 self-start max-w-full px-1 py-0.5 rounded-md text-b3 text-fgs2 hover:bg-bgs2-striped"
        aria-label={`Back to ${parentLabel || "Untitled space"}`}
        data-testid="space-back"
        onclick={onBack}
      >
        <Icon icon="chevron-left" size={Size.sm} class="stroke-fgs2" />
        <span class="truncate">{parentLabel || "Untitled space"}</span>
      </button>
    {/if}
    <div class="flex items-center gap-2 min-w-0">
      {#if space?.avatar}
        <AvatarRenderer avatar={space.avatar} size={Size.md} />
      {/if}
      {#if isTitleEditing}
        <input
          bind:this={titleInput}
          bind:value={draftTitle}
          class="flex-1 min-w-0 px-2 py-1 rounded-md border border-brs2 bg-bgs1 text-h4 font-semibold outline-none focus:border-aps1"
          placeholder="Untitled space"
          aria-label="Space name"
          data-testid="space-title-input"
          onkeydown={onTitleKeydown}
          onblur={saveTitle}
        />
      {:else}
        <button
          type="button"
          class={cn(
            "flex-1 min-w-0 px-1 rounded-md text-left text-h4 font-semibold truncate hover:bg-bgs2-striped",
            { "text-fgs3": !space?.label }
          )}
          title="Rename"
          aria-label={`Rename ${title}`}
          data-testid="space-title"
          onclick={() => store.setTitleEditing(true)}
        >
          {title}
        </button>
      {/if}
    </div>
    <div class="flex items-center gap-1">
      <div
        class="flex items-center p-0.5 rounded-md bg-bgs2"
        role="group"
        aria-label="Space view"
      >
        {#each views as option (option.value)}
          <button
            type="button"
            class={cn("flex items-center gap-1 px-2 py-1 rounded text-b3", {
              "bg-bgs1 text-fgs1 shadow-sm": view === option.value,
              "text-fgs2 hover:text-fgs1": view !== option.value
            })}
            aria-pressed={view === option.value}
            data-testid={`space-view-${option.value}`}
            onclick={() => onViewChange(option.value)}
          >
            <Icon icon={option.icon} size={Size.sm} class="stroke-current" />
            {option.label}
          </button>
        {/each}
      </div>
      <span class="flex-1"></span>
      <button
        type="button"
        class="p-1.5 rounded-md hover:bg-bgs2-striped"
        aria-pressed={isPinned}
        aria-label="Pin to app menu"
        title={isPinned ? "Unpin from app menu" : "Pin to app menu"}
        data-testid="space-pin"
        onclick={onTogglePin}
      >
        <Icon
          icon={isPinned ? "unpin" : "pin"}
          size={Size.sm}
          class="stroke-fgs2"
        />
      </button>
      {@render editButton()}
    </div>
  </header>
{/if}
