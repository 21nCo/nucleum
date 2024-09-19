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
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import {
    CollectionLayout,
    CollectionType,
    type ICollection
  } from "$lib/client/products/memotron/collection/collection.type";
  import SearchSingleSelect from "$lib/client/elements/select/SearchSingleSelect.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
  import Memocon from "../common/Memocon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import { propertyEditorStore } from "./properties/property.store";
  import { onMount } from "svelte";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Divider from "$lib/client/elements/Divider.svelte";
  import {
    resolveCollectionTypeIcon,
    resolveCollectionTypeLabel
  } from "./collection.utils";
  import Icon from "$lib/client/elements/Icon.svelte";

  let title: string;
  let isStarred: boolean = false;
  let selectedType: CollectionType = CollectionType.UNTYPED;
  let selectedView: CollectionLayout;
  let typeToExtend: ICollection | undefined = undefined;
  let isTypeExtension: boolean = false;
  let isCaptureShortcutEnabled: boolean = true;
  let properties: IProperty[] = [];
  let avatar: any;
  let coverPhoto: any;
  let isShowCoverPicker: boolean = false;
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
            action: "/kb/typed-collections"
          }
        };
      case CollectionType.QUERY:
        return {
          content:
            "Use query collections to store data based on a **filter/search query**. You can define the filters to filter the data you want to store. New items will be automatically added based on the filter criteria.",
          action: {
            label: "Learn more",
            action: "/kb/query-collections"
          }
        };
      default:
        return {
          content: "Use simple collections to store any **unstructured data.**",
          action: {
            label: "Learn more",
            action: "/kb/simple-collections"
          }
        };
    }
  }
</script>

<div class="flex w-full h-full items-start">
  <aside class="flex flex-col items-center justify-center w-48 h-full">
    {#if coverPhoto}
      <span> cover photo </span>
    {:else}
      <button class="text-fgs3 text-b2">+ add cover photo</button>
    {/if}
  </aside>
  <Divider orientation={Orientation.Vertical} />
  <div class="flex flex-col h-full gap-4 flex-1 items-center overflow-auto">
    <div class="flex flex-col gap-11 p-10 w-full overflow-auto">
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
            icon: resolveCollectionTypeIcon(type)
          }))}
          style={OptionSelectorStyle.TRAIN}
          labelProps={{
            ...formLabelConfig,
            label: "Type of collection"
          }}
          bind:selected={selectedType}
          size={Size.md}
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
              <Memocon bind:avatar />
            </span>
          {/if}
          <TextInput bind:value={title} width="grow" />
        </div>
      </div>
      {#if selectedType === CollectionType.TYPED}
        <div class="flex flex-col items-start w-full gap-2">
          <FormControlLabel props={{ label: "Properties" }} />
          <button
            class="flex justify-center items-center w-full border border-brs3 rounded-md h-11 text-base"
            on:click={() => {
              appStore.runAction(MemotronAction.EDIT_COLLECTION_PROPERTIES);
            }}
          >
            <span class="flex gap-2 text-fgs2 text-b2">
              <Icon
                icon={$propertyEditorStore.length > 0
                  ? "ph:pencil-simple-line-light"
                  : "ph:plus-light"}
                size={Size.sm}
              />
              {$propertyEditorStore.length > 0
                ? `Edit properties (${$propertyEditorStore.length})`
                : "Add properties"}
            </span>
          </button>
        </div>
        <div class="flex flex-col items-start w-full gap-3">
          <SwitchInput
            label={{
              ...formLabelConfig,
              label: "Extend an existing Type collection",
              orientation: Orientation.Horizontal,
              tooltip: {
                body: "You can extend an existing type by adding additional properties on top. Editing the properties on base type will reflect in all extended types.",
                actionText: "Learn more about advanced filter query",
                action: "/kb/advanced-filter-query"
              }
            }}
            isExpanded={true}
            bind:checked={isTypeExtension}
          />
          {#if isTypeExtension}
            <div class="flex flex-col items-start w-full gap-2">
              <SearchSingleSelect
                bind:selected={typeToExtend}
                searchStoreId={Resource.collection}
                placeholder="Search for a collection to extend"
              />
              <div class="text-b2 text-fgs3">
                Inherited properties: {typeToExtend?.properties?.length ?? 0}
              </div>
            </div>
          {/if}
        </div>
        <SwitchInput
          label={{
            ...formLabelConfig,
            label: "Create a capture shortcut",
            orientation: Orientation.Horizontal,
            tooltip: {
              body: "Enabling this will create a shortcut on capture page to seamlessly capture a new node entry and add it to the collection.",
              actionText: "Learn more",
              action: "/kb/type-collections"
            }
          }}
          bind:checked={isCaptureShortcutEnabled}
          isExpanded={true}
        />
      {/if}
      <OptionSelector
        options={collectionLayoutOptions}
        iconOrientation={Orientation.Vertical}
        size={Size.md}
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
      />
    </div>

    <ModalFooter
      action={resourceAction(Resource.collection, ResourceActionType.CREATE)}
      primaryAction={{
        label: "Save",
        callback: async () => {
          logger.log({
            at: "create collection",
            title,
            selectedType,
            typeToExtend
          });
          const result = await collectionStore.create({
            label: title,
            type: selectedType,
            defaultLayout: selectedView,
            isStarred,
            typeToExtend: typeToExtend?.id ?? undefined,
            isCaptureShortcutEnabled:
              selectedType === CollectionType.TYPED
                ? isCaptureShortcutEnabled
                : undefined,
            avatar: {
              code: avatar?.code,
              color: avatar?.color,
              isFilled: avatar?.isFilled,
              type: avatar?.type
            }
          });
          if (!result)
            return {
              error: "Error creating collection. Please try again."
            };
          return true;
        }
      }}
      secondaryAction={{
        label: "Discard"
      }}
    />
  </div>
</div>
