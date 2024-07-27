<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
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
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
  import Memocon from "../common/Memocon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import { propertyEditorStore } from "./properties/property.store";
  import { onMount } from "svelte";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { resourceAction } from "$lib/client/components/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/resourceStores/resource.type";
  let title: string;
  let errMsg: string;
  let isCreationInProgress: boolean = false;
  let isStarred: boolean = false;
  let selectedType: CollectionType = CollectionType.TYPED;
  let selectedView: CollectionLayout;
  let typeToExtend: ICollection | undefined = undefined;
  let isTypeExtension: boolean = false;
  let isCaptureShortcutEnabled: boolean = true;
  let properties: IProperty[] = [];
  let avatar: any;
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

<div class="flex flex-col w-full h-full items-start gap-4">
  <div class="flex flex-col gap-12 p-4 w-full overflow-auto">
    <!-- Cover photo -->
    <div class="flex items-end w-full gap-2">
      <TextInput
        label={{ ...formLabelConfig, label: "Name of the collection" }}
        bind:value={title}
        width="grow"
      />
      <Toggle icon="star" bind:on={isStarred} />
    </div>
    <OptionSelector
      options={[
        {
          label: "Simple Collection",
          value: CollectionType.UNTYPED,
          icon: "rectangle-stack"
        },
        {
          label: "Type Collection",
          value: CollectionType.TYPED,
          icon: "cube"
        },
        {
          label: "Filter query",
          value: CollectionType.QUERY,
          icon: "at-symbol"
        }
      ]}
      style={OptionSelectorStyle.TRAIN}
      labelProps={{
        ...formLabelConfig,
        label: "Type of collection"
      }}
      bind:selected={selectedType}
      size={Size.md}
    />
    <InlineInfoBanner {...generateInfo(selectedType)} />
    {#if selectedType === CollectionType.TYPED}
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
        <SearchSingleSelect
          bind:selected={typeToExtend}
          searchStoreId={Resource.collection}
          label={{ label: "Type to extend" }}
        />
      {/if}
      <div class="flex flex-col gap-2">
        <FormControlLabel props={{ label: "Avatar" }} />
        <!-- TODO - avatar causing loading performance issues -->
        <Memocon bind:avatar />
      </div>
      <div class="flex flex-col items-start w-full gap-2">
        <FormControlLabel props={{ label: "Properties" }} />
        {#if isTypeExtension}
          Inherited properties: {typeToExtend?.properties?.length ?? 0}
        {/if}
        <div class="flex justify-center w-full">
          <Button
            label={$propertyEditorStore.length > 0
              ? `Edit properties (${$propertyEditorStore.length})`
              : "Add properties"}
            style={ButtonStyle.OUTLINED}
            on:click={() => {
              appStore.runAction(MemotronAction.EDIT_COLLECTION_PROPERTIES);
            }}
          />
        </div>
      </div>
    {/if}
    <OptionSelector
      options={collectionLayoutOptions}
      iconOrientation={Orientation.Vertical}
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
  <footer class="flex flex-col w-full gap-2">
    {#if errMsg}
      <InlineErrorMessage bind:error={errMsg} />
    {/if}
    <ModalFooter
      primaryAction={{
        label: "Save",
        callback: async () => {
          console.log("creating collection", {
            title,
            selectedType,
            typeToExtend
          });
          isCreationInProgress = true;
          collectionStore.create({
            label: title,
            type: selectedType,
            defaultLayout: selectedView,
            isStarred,
            typeToExtend: typeToExtend?.id ?? undefined,
            isCaptureShortcutEnabled,
            avatar
          });
          isCreationInProgress = false;
          modalEvent.hideSpecific(
            resourceAction(Resource.collection, ResourceActionType.CREATE)
          );
        }
      }}
      secondaryAction={{
        label: "Discard",
        callback: async () => {
          modalEvent.hideSpecific(
            resourceAction(Resource.collection, ResourceActionType.CREATE)
          );
        }
      }}
    />
  </footer>
</div>
