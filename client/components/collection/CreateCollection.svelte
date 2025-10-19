<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { collectionLayoutOptions, collectionStore } from "@21n/components/collection/collection.store";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { OptionSelectorStyle } from "@21n/types/select.type";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  import {
    CollectionLayout,
    CollectionType
  } from "@21n/components/collection/collection.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import type { IProperty } from "@21n/components/collection/properties/property.type";
  import Avatar from "@21n/elements/avatarPicker/Avatar.svelte";
  import { propertyEditorStore } from "@21n/components/collection/properties/property.store";
  import { onMount } from "svelte";
  import ModalFooter from "@21n/components/modal/ModalFooter.svelte";
  import { ButtonVariant } from "@21n/types/button.type";
  import {
    resolveResourceIcon,
    resourceAction
  } from "@21n/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import { logger } from "@21n/components/debug/logger.client";
  import Divider from "@21n/elements/Divider.svelte";
  import {
    resolveCollectionResource,
    resolveCollectionTypeIcon,
    resolveCollectionTypeLabel
  } from "@21n/components/collection/collection.utils";
  import CoverPicker from "@21n/elements/coverPicker/CoverPicker.svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import CoverRenderer from "@21n/elements/coverPicker/CoverRenderer.svelte";
  import TypeExtensionAndPropertiesEditor from "@21n/components/collection/TypeExtensionAndPropertiesEditor.svelte";
  import { appStore } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import TextArea from "@21n/elements/input/TextArea.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import { tooltip } from "@21n/actions/popover.action";
  import ModalContentPadded from "@21n/components/modal/ModalContentPadded.svelte";

  export let context: ResourceAccessPoint | undefined = undefined;
  let title: string;
  let description: string;
  let isStarred: boolean = false;
  let selectedType: CollectionType = CollectionType.UNTYPED;
  let selectedView: CollectionLayout = CollectionLayout.BOARD;
  let isCaptureShortcutEnabled: boolean = true;
  let properties: IProperty[] = [];
  let avatar: any;
  let coverPhoto: any;
  let isShowCoverPicker: boolean = false;
  let isCoverPickerHovered: boolean = false;
  let collectibleResources: Resource[] = resolveCollectionResource(
    $appStore.product
  );
  let resource: Resource = collectibleResources[0];

  const formLabelConfig = {
    orientation: Orientation.Vertical
  };

  onMount(() => {
    propertyEditorStore.reset();
  });

  function generateInfo(selectedType: CollectionType) {
    switch (selectedType) {
      case CollectionType.TYPED:
        return {
          content:
            "Use typed collections to store **structured data**. You can define the properties of the data you want to store and customize avatar, content templates etc.",
          action: {
            label: "Learn more",
            action: $appStore?.appData?.urls?.kbTypedCollections
          }
        };
      case CollectionType.QUERY:
        return {
          content:
            "Use query collections to store data based on a **filter/search query**. You can define the filters to filter the data you want to store. New items will be automatically added based on the filter criteria.",
          action: {
            label: "Learn more",
            action: $appStore?.appData?.urls?.kbQueryCollections
          }
        };
      default:
        return {
          content: "Use simple collections to store any **unstructured data.**",
          action: {
            label: "Learn more",
            action: $appStore?.appData?.urls?.kbSimpleCollections
          }
        };
    }
  }

  async function onSave() {
    try {
      logger.log({
        at: "create collection",
        title,
        selectedType
      });
      const result = await collectionStore.save(
        {
          label: title,
          description,
          type: selectedType,
          defaultLayout: selectedView,
          isStarred,
          cover: coverPhoto,
          resource: resource,
          isCaptureShortcutEnabled:
            selectedType === CollectionType.TYPED
              ? isCaptureShortcutEnabled
              : undefined,
          avatar: avatar
            ? {
                code: avatar.code,
                color: avatar.color,
                file: avatar.file,
                isFilled: avatar.isFilled,
                type: avatar.type
              }
            : undefined
        },
        {
          context:
            context ??
            resourceAction(Resource.collection, ResourceActionType.CREATE)
        }
      );
      if (!result) {
        toasts.error("Error creating collection. Please try again.");
        return;
      }
      return true;
    } catch (e) {
      logger.error({ at: "create collection", error: e });
      toasts.error("Error creating collection. Please try again.");
    }
  }
</script>

<div class="flex w-full h-full items-start">
  {#if !$view.isConstrainedWidth && !$view.isPortrait}
    <button
      class="relative flex flex-col items-center justify-center w-48 h-full"
      use:hoverable={{
        onHover: (e) => {
          isCoverPickerHovered = e;
        }
      }}
      on:click={() => {
        isShowCoverPicker = true;
      }}
    >
      {#if coverPhoto}
        {#key coverPhoto}
          <CoverRenderer cover={coverPhoto} class="rounded-l-md" />
          {#if isCoverPickerHovered && !isShowCoverPicker}
            <div
              class="absolute top-0 left-0 w-full h-full flex flex-col gap-6 items-center justify-center bg-bgs2 bg-opacity-70 rounded-l-md"
            >
              <span class="text-fgs1">Click to replace</span>
              <Button
                icon="trash"
                label="Remove"
                type={ButtonVariant.DANGER}
                size={Size.sm}
                on:click={(e) => {
                  coverPhoto = undefined;
                  e?.detail?.stopPropagation();
                }}
              />
            </div>
          {/if}
        {/key}
      {:else}
        <span class="text-fgs3 text-b2"> + add cover photo </span>
      {/if}
    </button>
    <Divider orientation={Orientation.Vertical} />
  {/if}
  {#if isShowCoverPicker}
    <div class="h-full flex-1">
      <CoverPicker
        value={coverPhoto}
        on:close={() => {
          isShowCoverPicker = false;
        }}
        on:change={(e) => {
          coverPhoto = e.detail;
        }}
        on:select={(e) => {
          coverPhoto = e.detail;
        }}
      />
    </div>
  {:else}
    <div
      class="flex flex-col h-full gap-4 flex-1 items-center justify-between overflow-auto"
    >
      <ModalContentPadded class="flex flex-col gap-8 w-full overflow-auto mt-4">
        <div class="flex items-center justify-between w-full gap-2">
          <Text content="Create collection" style={TextStyle.PANEL_HEADING} />
          <span use:tooltip={{ text: "Star collection" }}>
            <Toggle icon="star" bind:on={isStarred} />
          </span>
        </div>
        <div class="flex flex-col w-full gap-6 flex-grow">
          <OptionSelector
            options={[
              CollectionType.UNTYPED,
              CollectionType.TYPED,
              CollectionType.QUERY
            ].map((type) => ({
              label: resolveCollectionTypeLabel(type),
              value: type,
              icon: resolveCollectionTypeIcon(type),
              isDisabled: type === CollectionType.QUERY,
              badge: type === CollectionType.QUERY ? "planned" : undefined,
              tooltip: generateInfo(type).content
            }))}
            style={$view.isConstrainedWidth
              ? OptionSelectorStyle.OUTLINE
              : OptionSelectorStyle.TRAIN}
            labelProps={{
              ...formLabelConfig,
              label: "Collection type"
            }}
            bind:selected={selectedType}
            size={$view.isConstrainedWidth ? Size.sm : Size.md}
            isPreventWrap={$view.isConstrainedWidth}
          />
          <!-- <InlineInfoBanner {...generateInfo(selectedType)} /> -->
        </div>
        {#if collectibleResources.length > 1}
          <OptionSelector
            options={collectibleResources.map((resource) => ({
              value: resource,
              label: `${resource}s`,
              icon: resolveResourceIcon(resource)
            }))}
            style={OptionSelectorStyle.CHECK_CIRCLE}
            size={Size.sm}
            bind:selected={resource}
            labelProps={{
              ...formLabelConfig,
              label: "Resource to collect"
            }}
          />
        {/if}
        <div class="flex flex-col gap-2">
          <FormControlLabel
            props={{
              label:
                selectedType === CollectionType.TYPED
                  ? "Avatar and title"
                  : "Title"
            }}
          />
          <div class="flex gap-2">
            {#if selectedType === CollectionType.TYPED}
              <span class="w-12 h-full">
                <Avatar bind:avatar isInEditMode={true} />
              </span>
            {/if}
            <TextInput
              bind:value={title}
              width="grow"
              placeholder="Name of the collection"
            />
          </div>
        </div>
        <TextArea
          bind:value={description}
          placeholder="Description (Optional)"
          rows={3}
          label={{ label: "Description", orientation: Orientation.Vertical }}
        />
        {#if selectedType === CollectionType.TYPED}
          <TypeExtensionAndPropertiesEditor
            bind:isCaptureShortcutEnabled
            {resource}
          />
        {/if}
        <!-- <OptionSelector
          options={collectionLayoutOptions}
          iconOrientation={Orientation.Vertical}
          size={$view.isConstrainedWidth ? Size.sm : Size.md}
          labelProps={{
            ...formLabelConfig,
            label: "Default view",
            tooltip: {
              body: "Choose the default view for your collection.",
              actionText: "Learn more about view types",
              action: "/kb/view-types"
            }
          }}
          bind:selected={selectedView}
        /> -->
      </ModalContentPadded>
      <ModalFooter
        action={resourceAction(Resource.collection, ResourceActionType.CREATE)}
        primaryAction={{
          label: "Save",
          callback: onSave
        }}
        secondaryAction={{
          label: "Discard"
        }}
      />
    </div>
  {/if}
</div>
