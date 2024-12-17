<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { collectionLayoutOptions, collectionStore } from "./collection.store";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import {
    CollectionLayout,
    CollectionType
  } from "$lib/client/products/memotron/collection/collection.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import { propertyEditorStore } from "./properties/property.store";
  import { onMount } from "svelte";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Divider from "$lib/client/elements/Divider.svelte";
  import {
    resolveCollectionTypeIcon,
    resolveCollectionTypeLabel
  } from "./collection.utils";
  import CoverPicker from "$lib/client/elements/coverPicker/CoverPicker.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import CoverRenderer from "$lib/client/elements/coverPicker/CoverRenderer.svelte";
  import TypeExtensionAndPropertiesEditor from "./TypeExtensionAndPropertiesEditor.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
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
</script>

<div class="flex w-full h-full items-start">
  {#if !$view.isConstrainedWidth}
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
        on:select={(e) => {
          coverPhoto = e.detail;
        }}
      />
    </div>
  {:else}
    <div
      class="flex flex-col h-full gap-4 flex-1 items-center justify-between overflow-auto"
    >
      <div class="flex flex-col gap-11 mo:p-4 p-10 w-full overflow-auto">
        <div class="flex items-center justify-between w-full gap-2">
          <Text content="Create collection" style={TextStyle.PANEL_HEADING} />
          <Toggle icon="star" bind:on={isStarred} />
        </div>
        <div class="flex flex-col gap-6">
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
              badge: type === CollectionType.QUERY ? "planned" : undefined
            }))}
            style={$view.isConstrainedWidth
              ? OptionSelectorStyle.OUTLINE
              : OptionSelectorStyle.TRAIN}
            labelProps={{
              ...formLabelConfig,
              label: "Type of collection"
            }}
            bind:selected={selectedType}
            size={$view.isConstrainedWidth ? Size.sm : Size.md}
            isPreventWrap={$view.isConstrainedWidth}
          />
          <InlineInfoBanner {...generateInfo(selectedType)} />
        </div>
        <div class="flex flex-col gap-2">
          <FormControlLabel
            props={{
              label:
                selectedType === CollectionType.TYPED
                  ? "Avatar and title"
                  : "Title"
            }}
          />
          <!-- TODO - avatar causing loading performance issues -->
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
          label={{ label: "Description", orientation: Orientation.Vertical }}
        />
        {#if selectedType === CollectionType.TYPED}
          <TypeExtensionAndPropertiesEditor bind:isCaptureShortcutEnabled />
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
      </div>

      <ModalFooter
        action={resourceAction(Resource.collection, ResourceActionType.CREATE)}
        primaryAction={{
          label: "Save",
          callback: async () => {
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
                  isCaptureShortcutEnabled:
                    selectedType === CollectionType.TYPED
                      ? isCaptureShortcutEnabled
                      : undefined,
                  avatar: {
                    code: avatar?.code,
                    color: avatar?.color,
                    file: avatar?.file,
                    isFilled: avatar?.isFilled,
                    type: avatar?.type
                  }
                },
                {
                  context:
                    context ??
                    resourceAction(
                      Resource.collection,
                      ResourceActionType.CREATE
                    )
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
        }}
        secondaryAction={{
          label: "Discard"
        }}
      />
    </div>
  {/if}
</div>
