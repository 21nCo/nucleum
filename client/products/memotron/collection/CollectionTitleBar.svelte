<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { IActiveCollectionStore } from "./collection.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { resolveCollectionContextMenu } from "./collection.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import AddResourceAction from "./AddResourceAction.svelte";
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  const dispatch = createEventDispatcher();
  export let searchQuery: string = "";
  export let collection: IActiveCollectionStore;
  export let isInEditMode: boolean = false;
  export let isShowMetaViews: boolean = false;
  export let isSingleViewMode: boolean = false;

  let contextMenu = [];
  let isSearchFocused: boolean = false;
  $: contextMenu = resolveCollectionContextMenu(
    $collection,
    ResourceAccessPoint.SELF
  );
  function onLabelChange(e: any) {
    console.log("collection - onLabelChange", e);
    if ($collection.label)
      collection.debouncedModify({ label: $collection.label });
  }
  function onSearchQueryChange(e: any) {
    dispatch("search", e);
  }
</script>

<div class="w-full flex justify-between items-center sticky- top--0 py--6">
  <!-- TODO breadcrumbs - if launched as child from a combination i.e. if parent present -->
  <!-- TODO - back button to previous resource - if launched from a mention or links -->
  <span
    class={cn(
      "flex items-center gap-2 font-medium text-h1 whitespace-nowrap min-w-fit flex-1 border rounded-md text-left",
      {
        "border-transparent": !isInEditMode,
        "border-brs3": isInEditMode
      }
    )}
  >
    {#if $collection.avatar}
      <AvatarView avatar={$collection.avatar} size={Size.lg} />
    {/if}
    {#if isInEditMode}
      <TextInput
        size={Size.lg}
        bind:value={$collection.label}
        placeholder="Node title"
        style={InputStyle.PLAIN}
        width="w-full"
        on:input={onLabelChange}
      />
    {:else}
      {$collection.label}
    {/if}
  </span>

  <span
    class={cn("flex gap-3 justify-end items-center", {
      "w-1/2": !isInEditMode,
      "w-1/3": isInEditMode
    })}
  >
    {#if $collection.isViewDataRefreshing}
      <div>
        <Icon icon="sync" size={Size.sm} />
      </div>
    {/if}
    {#if !isInEditMode}
      {#if isSingleViewMode}
        <AddResourceAction on:add isMinimalVariant={true} />
      {/if}
      <div
        class={cn("flex flex-1 rounded-full border px-3 py-2", {
          "border-aps1": isSearchFocused,
          "border-brs3": !isSearchFocused,
          "ml-2": isSingleViewMode
        })}
      >
        <TextInput
          style={InputStyle.PLAIN}
          bind:value={searchQuery}
          icon="ph:magnifying-glass"
          placeholder="Search this collection"
          on:focus={() => (isSearchFocused = true)}
          on:blur={() => (isSearchFocused = false)}
          on:input={onSearchQueryChange}
        />
      </div>
    {:else}
      <span class="text-fgs3 text-b3"> Edit mode is on </span>
    {/if}
    {#if !isSearchFocused}
      <slot name="additional"></slot>
      {#if !isInEditMode}
        <Toggle
          icon="ph:monitor-play-thin"
          tooltip="More actions"
          bind:on={isShowMetaViews}
        />
      {/if}
      <Toggle
        icon={isInEditMode
          ? "ph:pencil-simple-slash-light"
          : "ph:pencil-simple-line-thin"}
        tooltip={isInEditMode ? "Exit edit mode" : "Enter edit mode"}
        bind:on={isInEditMode}
      />
      <ContextMenuAction {contextMenu} id="collectionContextMenu" />
    {/if}
  </span>
</div>
