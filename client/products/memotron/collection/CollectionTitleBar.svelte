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
  import { CollectionType } from "./collection.type";
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import { objIsEmpty } from "$lib/shared/utils/obj.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { resizeListener } from "$lib/client/actions/resize.action";
  const dispatch = createEventDispatcher();
  export let searchQuery: string = "";
  export let collection: IActiveCollectionStore;
  export let isInEditMode: boolean = false;
  export let isShowMetaViews: boolean = false;
  export let isSingleViewMode: boolean = false;

  let contextMenu = [];
  let isSearchFocused: boolean = false;
  let searchBoxRef: TextInput;
  let isMiniSearch = false;
  $: contextMenu = resolveCollectionContextMenu(
    $collection,
    ResourceAccessPoint.SELF
  );
  function onLabelChange(e: any) {
    if ($collection.label)
      collection.debouncedModify({ label: $collection.label });
  }

  function onAvatarChange() {
    collection.debouncedModify({ avatar: $collection.avatar });
  }

  function onSearchQueryChange(e: any) {
    dispatch("search", e);
  }
</script>

<div
  class="w-full flex gap-1 justify-between items-center sticky- top--0 py--6"
>
  <!-- TODO breadcrumbs - if launched as child from a combination i.e. if parent present -->
  <!-- TODO - back button to previous resource - if launched from a mention or links -->
  {#if $collection.type === CollectionType.TYPED}
    <span
      class={cn("flex h-12 items-center justify-center", {
        "w-12": isInEditMode,
        "w-8": $collection.avatar && !isInEditMode
      })}
    >
      {#if isInEditMode}
        <!-- TODO - setting isInEditMode to false as AvatarPicker is causing freezing issue -->
        <Avatar
          bind:avatar={$collection.avatar}
          isInEditMode={false}
          on:change={onAvatarChange}
          size={Size.lg}
        />
      {:else}
        <Avatar
          avatar={!$collection.avatar || objIsEmpty($collection.avatar)
            ? $collection.typeToExtend?.avatar
            : $collection.avatar}
          isInEditMode={false}
          size={Size.lg}
        />
      {/if}
    </span>
  {/if}
  <span
    class={cn(
      "flex items-center gap-4 font-medium text-h1 whitespace-nowrap flex-1 min-w-0 border rounded-md text-left mr-6",
      {
        "border-transparent": !isInEditMode,
        "border-brs3 px-2": isInEditMode
      }
    )}
  >
    <!-- {#if $collection.avatar}
      <AvatarView avatar={$collection.avatar} size={Size.lg} />
    {/if} -->
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
      <div class="truncate">
        {$collection.label}
      </div>
    {/if}
    {#if !isInEditMode && $collection.type === CollectionType.TYPED}
      <button
        class="flex text-b3 text-fgs3 rounded-md border border-brs3"
        on:click={() => (isInEditMode = true)}
      >
        <span class="flex gap-2 items-center px-2 py-0.5">
          <Icon icon="ph:cube-light" size={Size.sm} class="stroke-fgs3" />
          {$collection.properties.length}
          {$collection.properties.length === 1 ? "property" : "properties"}
        </span>
        {#if $collection.typeToExtend}
          <span class="flex rounded-r-md bg-bgs2 px-2 py-0.5">
            + {$collection.typeToExtend.properties?.length ?? 0}
          </span>
        {/if}
      </button>
    {/if}
  </span>

  <span
    class={cn("flex gap-3 justify-end items-center", {
      "w-1/2": !isInEditMode,
      "w-1/3": isInEditMode
    })}
  >
    <!-- {#if $collection.isViewDataRefreshing}
      <div>
        <Icon icon="svg-spinners:90-ring-with-bg" class="stroke-fgs1" />
      </div>
    {/if} -->
    {#if !isInEditMode}
      <div
        class={cn("flex rounded-full", {
          "border-aps1": isSearchFocused,
          "border-brs3": !isSearchFocused,
          // "ml-2": isSingleViewMode && !isMiniSearch,
          "flex-1 border px-3 py-2": !isMiniSearch || isSearchFocused
        })}
        use:resizeListener={(e) => {
          isMiniSearch = e.width < 120;
        }}
      >
        {#if isMiniSearch && !isSearchFocused}
          <Button
            icon="ph:magnifying-glass"
            tooltip="Search this collection"
            on:click={() => {
              isSearchFocused = true;
              setTimeout(() => {
                searchBoxRef?.focus();
              }, 10);
            }}
          />
        {:else}
          <TextInput
            style={InputStyle.PLAIN}
            bind:value={searchQuery}
            bind:this={searchBoxRef}
            icon="ph:magnifying-glass"
            placeholder="Search this collection"
            on:focus={() => (isSearchFocused = true)}
            on:blur={() => (isSearchFocused = false)}
            on:input={onSearchQueryChange}
          />
        {/if}
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
      {#if isSingleViewMode}
        <AddResourceAction on:add isMinimalVariant={true} />
      {/if}
    {/if}
  </span>
</div>
