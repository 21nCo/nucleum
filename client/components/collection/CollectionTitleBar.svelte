<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { IActiveCollectionStore } from "./collection.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { resolveCollectionContextMenu } from "./collection.store";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import AddResourceAction from "./AddResourceAction.svelte";
  import { CollectionType } from "./collection.type";
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import { objIsEmpty } from "$lib/shared/utils/obj.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { resizeListener } from "$lib/client/actions/resize.action";
  import { Placement } from "$lib/client/types/direction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { popover, tooltip } from "$lib/client/actions/popover.action";
  import view from "$lib/client/stores/view.store";
  import Tooltip from "$lib/client/elements/text/Tooltip.svelte";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import FormLabelTooltip from "$lib/client/elements/text/formLabel/FormLabelTooltip.svelte";
  import { isValidAvatar } from "$lib/client/elements/avatarPicker/avatar.utils";
  import { fade } from "svelte/transition";
  import { resourceAction } from "../flux/resourceStores/resource.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import CollectionDescriptionEditPopover from "./CollectionDescriptionEditPopover.svelte";

  const dispatch = createEventDispatcher();
  export let searchQuery: string = "";
  export let collection: IActiveCollectionStore;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let isShowMetaViews: boolean = false;
  export let isSingleViewMode: boolean = false;
  export let isConstrainedWidth: boolean = false;
  let dev_isEnableMetaViewsToggle: boolean = false;

  let isSearchFocused: boolean = false;
  let searchBoxRef: TextInput;
  let rightPartWidth = 0;

  $: isMiniSearch = rightPartWidth < 530;
  $: isDetailsBesideTitleRenderable =
    !isConstrainedWidth &&
    (!isMiniSearch || (isMiniSearch && !isSearchFocused));

  function onLabelChange(e: any) {
    if ($collection.label) collection.modify({ label: $collection.label });
  }

  function onAvatarChange() {
    collection.modify({ avatar: $collection.avatar });
  }

  function onSearchQueryChange(e: any) {
    dispatch("search", e);
  }

  function openPropertiesEditor() {
    appStore.runAction(
      resourceAction(Resource.property, ResourceActionType.EDIT),
      {
        componentParams: {
          id: collection?.id
        }
      }
    );
  }

  function resolveSearchPlaceholder(count: number) {
    return `Search this collection ${count ? `(${count} items)` : ""}`;
  }
</script>

<div
  class="w-full flex gap-1 justify-between items-center sticky- top--0 py--6"
>
  <!-- TODO breadcrumbs - if launched as child from a combination i.e. if parent present, back button to previous resource - if launched from a mention or links -->
  {#if isConstrainedWidth && accessPoint !== ResourceAccessPoint.MARKDOWN_EMBED}
    <button
      class="flex active:bg-bgs2 rounded-md p-1"
      on:click={() => {
        appStore.goBack();
        // appStore.closeResource({
        //   id: collection.id
        // });
      }}
    >
      <Icon icon="ph:caret-left-light" size={Size.lg} />
    </button>
  {/if}
  {#if $collection.type === CollectionType.TYPED}
    {@const avatar =
      !$collection.avatar || objIsEmpty($collection.avatar)
        ? $collection.typeToExtend?.avatar
        : $collection.avatar}
    {@const isAvatarPresent = isValidAvatar(avatar)}
    <span
      class={cn("flex h-12 items-center justify-center", {
        "w-12": $collection.isInEditMode,
        "w-8": isAvatarPresent && !$collection.isInEditMode
      })}
    >
      {#if $collection.isInEditMode}
        <Avatar
          bind:avatar={$collection.avatar}
          isInEditMode={true}
          on:change={onAvatarChange}
          size={Size.lg}
        />
      {:else if isAvatarPresent}
        <Avatar {avatar} isInEditMode={false} size={Size.lg} />
      {/if}
    </span>
  {/if}
  <span
    class={cn(
      "flex items-center gap-4 font-medium cw:text-h4 cw:h-12 text-h1 whitespace-nowrap flex-1 min-w-0 border rounded-md text-left cw:mr-0 mr-6",
      {
        "border-transparent": !$collection.isInEditMode,
        "border-brs3 px-2": $collection.isInEditMode
      }
    )}
  >
    <!-- {#if $collection.avatar}
      <AvatarView avatar={$collection.avatar} size={Size.lg} />
    {/if} -->
    {#if $collection.isInEditMode}
      <TextInput
        size={Size.lg}
        bind:value={$collection.label}
        placeholder="Collection title"
        style={InputStyle.PLAIN}
        width="w-full"
        on:debouncedChange={onLabelChange}
      />
    {:else}
      <div class="truncate userdata">
        {$collection.label ?? "Untitled collection"}
      </div>
    {/if}
    {#if ($collection.description && isDetailsBesideTitleRenderable) || $collection.isInEditMode}
      <span
        class="flex justify-center items-center"
        use:popover={{
          triggerMethod: $collection.isInEditMode
            ? [PopoverTriggerMethod.CLICK]
            : [PopoverTriggerMethod.HOVER, PopoverTriggerMethod.CLICK],
          content: $collection.isInEditMode
            ? CollectionDescriptionEditPopover
            : Tooltip,
          componentProps: {
            collection,
            info: {
              body: $collection.description,
              size: Size.sm
            }
          }
        }}
        use:tooltip={{
          disabled: !$collection.isInEditMode,
          text: "Collection description"
        }}
      >
        <Icon icon="ph:info-light" size={Size.sm} />
      </span>
    {/if}
    {#if $collection.isStarred && isDetailsBesideTitleRenderable}
      <button
        class="flex items-center justify-center"
        use:tooltip={{
          text: "Unstar collection"
        }}
      >
        <Icon
          icon="star"
          class="fill-yellow-400"
          on:click={() => {
            collection.modify({ isStarred: false });
          }}
        />
      </button>
    {/if}
    {#if !$collection.isInEditMode && $collection.type === CollectionType.TYPED && isDetailsBesideTitleRenderable}
      <button
        class="flex text-b3 text-fgs3 rounded-md border border-brs3"
        on:click={openPropertiesEditor}
        use:tooltip={{
          text: "Edit properties"
        }}
      >
        <span class="flex gap-2 items-center px-2 py-0.5">
          <Icon icon="ph:cube-light" size={Size.sm} class="stroke-fgs3" />
          {$collection.properties?.length ?? 0}
          {#if !isConstrainedWidth && !isMiniSearch}
            {($collection.properties?.length ?? 0) === 1 ? "property" : "properties"}
          {/if}
        </span>
        {#if $collection.typeToExtend}
          <span class="flex rounded-r-md bg-bgs2 px-2 py-0.5">
            + {$collection.typeToExtend.properties?.length ?? 0}
          </span>
        {/if}
      </button>
    {:else if $collection.isInEditMode && $collection.type === CollectionType.TYPED && !isConstrainedWidth}
      <button
        class="flex text-b3 text-fgs3 rounded-md border border-brs3 px-2 py-0.5 items-center gap-1 hover:bg-bgs2"
        on:click={openPropertiesEditor}
      >
        <Icon icon="ph:cube-light" size={Size.sm} class="stroke-fgs3" />
        edit properties ({$collection.properties?.length ?? 0})
      </button>
    {/if}
  </span>

  {#if isConstrainedWidth && accessPoint !== ResourceAccessPoint.MARKDOWN_EMBED}
    <ContextMenuAction
      menuResolver={() =>
        resolveCollectionContextMenu($collection, ResourceAccessPoint.SELF)}
      position={Placement.Left}
      id="collectionContextMenu"
      size={Size.lg}
    />
  {:else if accessPoint !== ResourceAccessPoint.MARKDOWN_EMBED}
    <span
      class={cn("flex gap-3 justify-end items-center", {
        "w-1/2": !$collection.isInEditMode && !isMiniSearch,
        "w-2/3": !$collection.isInEditMode && isMiniSearch && isSearchFocused,
        "w-1/3": $collection.isInEditMode
      })}
      use:resizeListener={(e) => {
        rightPartWidth = e.width;
      }}
    >
      {#if !$collection.isInEditMode && $collection.totalItemCount}
        <div
          class={cn("flex rounded-full", {
            "border-aps1": isSearchFocused,
            "border-brs3": !isSearchFocused,
            // "ml-2": isSingleViewMode && !isMiniSearch,
            "flex-1 border px-3 py-2": !isMiniSearch || isSearchFocused
          })}
          transition:fade={{ duration: 100 }}
        >
          {#if isMiniSearch && !isSearchFocused}
            <Button
              icon="ph:magnifying-glass"
              tooltip={resolveSearchPlaceholder($collection.totalItemCount)}
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
              placeholder={resolveSearchPlaceholder($collection.totalItemCount)}
              on:focus={() => (isSearchFocused = true)}
              on:blur={() => (isSearchFocused = false)}
              on:input={onSearchQueryChange}
            />
          {/if}
        </div>
      {/if}
      {#if !isSearchFocused}
        <slot name="additional"></slot>
        {#if !$collection.isInEditMode && dev_isEnableMetaViewsToggle}
          <Toggle
            icon="ph:monitor-play-light"
            tooltip="Play actions"
            bind:on={isShowMetaViews}
          />
        {/if}
        {#if !$collection.isInEditMode}
          <Toggle
            icon="ph:pencil-simple-line-light"
            tooltip="Enter edit mode"
            bind:on={$collection.isInEditMode}
          />
        {/if}
        <ContextMenuAction
          menuResolver={() =>
            resolveCollectionContextMenu($collection, ResourceAccessPoint.SELF)}
          position={Placement.BottomCenter}
          id="collectionContextMenu"
          size={Size.lg}
        />
        {#if isSingleViewMode}
          <AddResourceAction on:add variant="default" />
        {/if}
      {/if}
    </span>
  {/if}
</div>
