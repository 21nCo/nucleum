<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { collectionStore } from "./collection.store";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import {
    CollectionLayout,
    CollectionType
  } from "$lib/client/components/collection/collection.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { IProperty } from "$lib/client/components/collection/properties/property.type";
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import { propertyEditorStore } from "./properties/property.store";
  import { onMount } from "svelte";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import {
    resolveResourceIcon,
    resourceAction
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import {
    resolveCollectionResource,
    resolveCollectionTypeIcon,
    resolveCollectionTypeLabel
  } from "./collection.utils";
  import TypeExtensionAndPropertiesEditor from "./TypeExtensionAndPropertiesEditor.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  import { tooltip } from "$lib/client/actions/popover.action";
  import ModalContentPadded from "$lib/client/components/modal/ModalContentPadded.svelte";

  export let context: ResourceAccessPoint | undefined = undefined;
  let title: string;
  let description: string;
  let isStarred: boolean = false;
  let selectedType: CollectionType = CollectionType.TYPED;
  let selectedView: CollectionLayout = CollectionLayout.BOARD;
  let isCaptureShortcutEnabled: boolean = true;
  let properties: IProperty[] = [];
  let avatar: any;
  let coverPhoto: any;
  let collectibleResources: Resource[] = resolveCollectionResource(
    $appStore.product
  );
  let resource: Resource = collectibleResources[0];
  const dev_isShowTypeSelector: boolean = false;

  const formLabelConfig = {
    orientation: Orientation.Vertical
  };

  onMount(() => {
    propertyEditorStore.reset();
  });

  function generateInfo(selectedType: CollectionType) {
    switch (selectedType) {
      case CollectionType.SYNCED:
        return {
          content:
            "Use synced collections to sync data from external sources or apps.",
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
  <div
    class="flex flex-col h-full gap-4 flex-1 items-center justify-between overflow-auto"
  >
    <ModalContentPadded
      class="flex flex-col gap-8 w-full flex-grow overflow-auto mt-4"
    >
      <div class="flex items-center justify-between w-full gap-2">
        <Text content="Create collection" style={TextStyle.PANEL_HEADING} />
        <span use:tooltip={{ text: "Star collection" }}>
          <Toggle icon="star" bind:on={isStarred} />
        </span>
      </div>
      {#if dev_isShowTypeSelector}
        <div class="flex flex-col w-full gap-6">
          <OptionSelector
            options={[
              CollectionType.TYPED,
              CollectionType.QUERY,
              CollectionType.SYNCED
            ].map((type) => ({
              label: resolveCollectionTypeLabel(type),
              value: type,
              icon: resolveCollectionTypeIcon(type),
              isDisabled: type === CollectionType.SYNCED,
              badge: type === CollectionType.SYNCED ? "planned" : undefined,
              tooltip: generateInfo(type)?.content
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
      {/if}

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
</div>
