<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { IActiveCollectionStore } from "@21n/components/collection/collection.store";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { Size } from "@21n/types/size.enum";
  import { InputStyle } from "@21n/types/input.type";
  import ContextMenuAction from "@21n/elements/contextMenu/ContextMenuAction.svelte";
  import { resolveCollectionContextMenu } from "@21n/components/collection/collection.store";
  import {
    AccessMode,
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import AddResourceAction from "@21n/components/collection/AddResourceAction.svelte";
  import { CollectionType } from "@21n/components/collection/collection.type";
  import Avatar from "@21n/elements/avatarPicker/Avatar.svelte";
  import { objIsEmpty } from "@21n/shared-utils/obj.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import { resizeListener } from "@21n/actions/resize.action";
  import { Placement } from "@21n/types/direction.enum";
  import { appStore } from "@21n/stores/app.store";
  import { popover, tooltip } from "@21n/actions/popover.action";
  import view from "@21n/stores/view.store";
  import Tooltip from "@21n/elements/text/Tooltip.svelte";
  import TextArea from "@21n/elements/input/TextArea.svelte";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import FormLabelTooltip from "@21n/elements/text/formLabel/FormLabelTooltip.svelte";
  import { isValidAvatar } from "@21n/elements/avatarPicker/avatar.utils";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import CollectionDescriptionEditPopover from "@21n/components/collection/CollectionDescriptionEditPopover.svelte";
  import RecordStarStatusFeedback from "@21n/components/record/RecordStarStatusFeedback.svelte";
  import BackButton from "@21n/elements/button/BackButton.svelte";
  import ResourceInlineCloseButton from "@21n/elements/button/ResourceInlineCloseButton.svelte";
  import type { ICollection } from "@21n/components/collection/collection.type";

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

  function resolveCollectionForContextMenu() {
    return $collection as unknown as ICollection;
  }
</script>

<div
  class={cn(
    "min-w-0 flex-1 gap-2 items-center sticky- top--0 py--6",
    {
      "flex justify-between": isConstrainedWidth,
      grid: !isConstrainedWidth
    },
    !isConstrainedWidth && {
      "grid-cols-[auto_1fr]": !$collection.isInEditMode,
      "grid-cols-[1fr_auto]": $collection.isInEditMode
    }
  )}
>
  <!-- TODO breadcrumbs - if launched as child from a combination i.e. if parent present, back button to previous resource - if launched from a mention or links -->

  <BackButton
    isEnabled={!$collection.isInEditMode &&
      isConstrainedWidth &&
      accessPoint !== ResourceAccessPoint.MARKDOWN_EMBED &&
      $collection.accessMode !== AccessMode.INLINE &&
      $collection.accessMode !== AccessMode.FULL}
    accessMode={$collection.accessMode}
    class="truncate"
  >
    {#if $collection.type === CollectionType.TYPED}
      {@const avatar =
        !$collection.avatar || objIsEmpty($collection.avatar)
          ? $collection.typeToExtend?.avatar
          : $collection.avatar}
      {@const isAvatarPresent = isValidAvatar(avatar)}
      <span
        class={cn("flex h-10 items-center justify-center", {
          "w-12": $collection.isInEditMode,
          "w-8": isAvatarPresent && !$collection.isInEditMode
        })}
      >
        {#if $collection.isInEditMode}
          <Avatar
            bind:avatar={$collection.avatar}
            isInEditMode={true}
            on:change={onAvatarChange}
            size={Size.md}
          />
        {:else if isAvatarPresent}
          <Avatar {avatar} isInEditMode={false} size={Size.md} />
        {/if}
      </span>
    {/if}
    <span
      class={cn(
        "flex items-center gap-4 font-medium cw:text-h4 cw:h-12 text-h2 whitespace-nowrap flex-1 min-w-0 border rounded-md text-left cw:mr-0 mr-6",
        {
          "border-transparent": !$collection.isInEditMode,
          "border-brs3 px-2 max-w-xl": $collection.isInEditMode
        }
      )}
    >
      <!-- {#if $collection.avatar}
      <AvatarView avatar={$collection.avatar} size={Size.lg} />
    {/if} -->
      {#if $collection.isInEditMode}
        <TextInput
          size={Size.md}
          bind:value={$collection.label}
          placeholder="Collection title"
          style={InputStyle.PLAIN}
          width="w-full"
          on:debouncedChange={onLabelChange}
        />
      {:else}
        {@const title =
          ($collection.label ?? "").trim() || "Untitled collection"}
        <div class="truncate userdata">{title}</div>
      {/if}
      {#if ($collection.description && isDetailsBesideTitleRenderable) || $collection.isInEditMode}
        {@const popoverComponent = $collection.isInEditMode
          ? CollectionDescriptionEditPopover
          : Tooltip}
        {@const popoverProps = $collection.isInEditMode
          ? { collection }
          : { info: { body: $collection.description, size: Size.sm } }}
        <button
          class="flex justify-center items-center"
          use:popover={{
            triggerMethod: $collection.isInEditMode
              ? [PopoverTriggerMethod.CLICK]
              : [PopoverTriggerMethod.HOVER, PopoverTriggerMethod.CLICK],
            content: popoverComponent,
            isRenderAsModalForCW: isConstrainedWidth,
            componentProps: popoverProps
          }}
          use:tooltip={{
            disabled: !$collection.isInEditMode,
            text: "Collection description"
          }}
          type="button"
          aria-label="Collection description"
        >
          <Icon icon="info" size={Size.sm} />
        </button>
      {/if}
      {#if $collection.isStarred && isDetailsBesideTitleRenderable}
        <button
          class="flex items-center justify-center"
          type="button"
          aria-pressed={$collection.isStarred}
          on:click={() => {
            collection.modify({ isStarred: false });
          }}
          use:tooltip={{ text: "Unstar collection" }}
        >
          <RecordStarStatusFeedback
            isStarred={$collection.isStarred}
            size={Size.md}
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
          Edit properties ({$collection.properties?.length ?? 0})
        </button>
      {/if}
    </span>
  </BackButton>

  {#if isConstrainedWidth && accessPoint !== ResourceAccessPoint.MARKDOWN_EMBED}
    <div class="flex gap-2 justify-center items-center">
      <ContextMenuAction
        menuResolver={() =>
          resolveCollectionContextMenu(
            resolveCollectionForContextMenu(),
            ResourceAccessPoint.SELF,
            {
              accessMode: $collection.accessMode
            }
          )}
        position={Placement.Left}
        id="collectionContextMenu"
        size={Size.lg}
      />
      <ResourceInlineCloseButton
        accessMode={$collection.accessMode}
        id={$collection.id}
      />
    </div>
  {:else if accessPoint !== ResourceAccessPoint.MARKDOWN_EMBED}
    <span
      class="flex gap-3 justify-end items-center"
      use:resizeListener={(e) => {
        if (isSearchFocused) return;
        rightPartWidth = e.width;
      }}
    >
      {#if !$collection.isInEditMode && $collection.totalItemCount}
        <div
          class={cn(
            "flex rounded-full h-full transition-all duration-250 ease-in-out",
            {
              "border-aps1": isSearchFocused,
              "border-brs3 max-w-2xl": !isSearchFocused,
              "min-w-0 flex-1 border px-3 py-1.5":
                !isMiniSearch || isSearchFocused
            }
          )}
        >
          {#if isMiniSearch && !isSearchFocused}
            <button
              on:click={() => {
                isSearchFocused = true;
                setTimeout(() => {
                  searchBoxRef?.focus();
                }, 10);
              }}
              class="flex items-center justify-center"
              title={resolveSearchPlaceholder($collection.totalItemCount)}
            >
              <Icon icon="search" />
            </button>
          {:else}
            <TextInput
              style={InputStyle.PLAIN}
              bind:value={searchQuery}
              bind:this={searchBoxRef}
              icon="search"
              placeholder={resolveSearchPlaceholder($collection.totalItemCount)}
              on:focus={() => (isSearchFocused = true)}
              on:blur={(e) => (isSearchFocused = false)}
              isShowClearControl={searchQuery !== "" || isSearchFocused}
              on:cancel={() => {
                searchQuery = "";
                dispatch("search");
                isSearchFocused = false;
              }}
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
            icon="edit"
            tooltip="Enter edit mode"
            bind:on={$collection.isInEditMode}
          />
        {/if}
        <ContextMenuAction
          menuResolver={() =>
            resolveCollectionContextMenu(
              resolveCollectionForContextMenu(),
              ResourceAccessPoint.SELF,
              {
                accessMode: $collection.accessMode
              }
            )}
          position={Placement.BottomCenter}
          id="collectionContextMenu"
          size={Size.lg}
        />
        {#if isSingleViewMode}
          <AddResourceAction on:add variant="default" />
        {/if}
        <ResourceInlineCloseButton
          accessMode={$collection.accessMode}
          id={$collection.id}
        />
      {/if}
    </span>
  {/if}
</div>
