<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { Size } from "$lib/client/types/size.enum";
  import {
    TableCellDefaultAction,
    TableCellType,
    type TableColumn
  } from "$lib/client/types/table.type";
  import { enumToString, isValidString } from "$lib/shared/utils/text.utils";
  import { generateResourceId } from "$lib/client/components/flux/flux.utils";

  import {
    manualPropertyTypes,
    PropertyType,
    propertyTypesWithUserConfiguration,
    selectOptionsPropertyTypes,
    UniversalPropertyType,
    type IProperty
  } from "./property.type";
  import { propertyEditorStore, propertyStore } from "./property.store";
  import {
    ActiveCollectionStore,
    collectionStore,
    type IActiveCollectionStore
  } from "$lib/client/components/collection/collection.store";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import {
    ResourceAccessMode,
    ResourceActionType,
    type OmitForCaptureWithId
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { onMount } from "svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { logger } from "$lib/client/components/debug/logger.client";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import SearchSingleSelect from "$lib/client/elements/select/SearchSingleSelect.svelte";
  import { CollectionType, type ICollection } from "../collection.type";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { AlertType } from "$lib/client/types/notification.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { appStore } from "$lib/client/stores/app.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import PropertyTypeSelector from "./propertyTypeSelector/PropertyTypeSelector.svelte";
  import {
    isSameResource,
    resourceAction,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { resolvePropertyDefaultConfig } from "./property.utils";
  import { objIsEmpty } from "$lib/shared/utils/obj.utils";
  import CollectionTitleLabelPart from "../thumbnail/CollectionThumbnailLabel.svelte";
  import { Product } from "$lib/client/products/product.type";
  import Table3 from "$lib/client/elements/table/Table3.svelte";
  export let id: IRecordId | undefined = undefined;
  let collection: IActiveCollectionStore | undefined = id
    ? ActiveCollectionStore.resolve(id)
    : undefined;
  let derivedCollections: ICollection[] = [];
  let tableId = "properties-table";
  const propertiesEditAction = resourceAction(
    Resource.property,
    ResourceActionType.EDIT
  );
  let columns: TableColumn[] = [
    {
      label: "Type of property",
      key: "propertyType",
      width: 0.65,
      type: TableCellType.CUSTOM,
      component: PropertyTypeSelector,
      componentProps: {
        onChange: onPropertyTypeChange
      }
    },
    {
      label: "Label",
      key: "label",
      width: 0.65,
      type: TableCellType.TEXT_INPUT,
      placeholder: (row: any) => {
        return enumToString(row.type);
      }
    },
    {
      label: "Configuration",
      key: "config",
      type: TableCellType.CUSTOM,
      component: "propertyConfig"
    },
    {
      label: "Always visible",
      key: "isShowOnNodePage",
      width: 0.5,
      type: TableCellType.TOGGLE,
      tooltip: {
        body: "Selecting this will make the property always visible on the node/goal page. Otherwise, it will be present in properties panel.",
        size: Size.xs
      }
    }
  ];
  if (
    $appStore.product === Product.MEMOTRON ||
    $appStore.product === Product.NUCLEUS
  ) {
    columns.push({
      label: "Capture",
      key: "isShowOnCapture",
      width: 0.4,
      type: TableCellType.TOGGLE,
      tooltip: {
        body: "Selecting this will show the property during capture or clipping if an item is added to this typed collection. Using this will make capturing essential properties easier at source.",
        size: Size.xs
      },
      disabledCriteria: (row: any) => !manualPropertyTypes.includes(row.type)
    });
  }
  let isTypeExtension: boolean = $propertyEditorStore?.typeToExtend
    ? true
    : false;
  async function onAdd() {
    const newProperty: OmitForCaptureWithId<IProperty> = {
      id: generateResourceId(Resource.property),
      label: "",
      isShowOnNodePage: false,
      isShowOnCapture: false,
      type: PropertyType.TEXT,
      order: $propertyEditorStore.properties.length
    };
    $propertyEditorStore.properties = [
      ...$propertyEditorStore.properties,
      newProperty
    ];
    if (collection) {
      await propertyStore.create([newProperty]);
    }
  }

  onMount(async () => {
    if (collection && (!$collection || !$collection.label)) {
      await collection.init(ResourceAccessMode.POP);
    } else if (collection) {
      await collection.refreshProperties();
      propertyEditorStore.set({
        properties: $collection?.properties ?? [],
        typeToExtend: $collection?.typeToExtend
      });
    }
    isTypeExtension = $propertyEditorStore?.typeToExtend ? true : false;
    if (collection)
      derivedCollections = await collectionStore.fetchDerivedCollections(
        collection?.id
      );
  });

  function onPropertyTypeChange(e: { id: IRecordId; type: PropertyType }) {
    const existing = $propertyEditorStore.properties.find(resourceInList(e));
    if (!existing) return;

    if (
      !propertyTypesWithUserConfiguration.includes(existing.type) ||
      (selectOptionsPropertyTypes.includes(existing.type) &&
        selectOptionsPropertyTypes.includes(e.type) &&
        e.type !== PropertyType.UNIVERSAL)
    ) {
      convert();
    } else {
      confirmationNotification.notify({
        message: `You are about to change the property type of **${isValidString(existing.label) ? existing.label : "Untitled"}** from **${enumToString(existing.type)}** to **${enumToString(e.type)}**. This will delete existing configuration for this property. Are you sure you want to proceed?`,
        title: "Change property type",
        type: AlertType.WARNING,
        confirmAction: {
          label: "Confirm",
          callback: async () => {
            convert(true);
          }
        }
      });
    }

    function convert(isResetConfig: boolean = false) {
      $propertyEditorStore.properties = $propertyEditorStore.properties.map(
        (property) =>
          isSameResource(property, e)
            ? {
                ...property,
                type: e.type,
                config:
                  isResetConfig ||
                  !property.config ||
                  objIsEmpty(property.config)
                    ? resolvePropertyDefaultConfig(e.type)
                    : property.config
              }
            : property
      );
    }
  }

  function resolveTitle(collection: IActiveCollectionStore | undefined) {
    return collection
      ? ($collection?.label ?? "Untitled") + " - edit properties"
      : "Edit properties";
  }

  function onReorder(
    event: CustomEvent<{ from: number; to: number; listId: string }>
  ) {
    logger.log({ at: "PropertiesEditor.onReorder", event });
    const { from, to, listId } = event.detail;
    if (!listId || listId !== tableId) return;
    const { properties } = $propertyEditorStore;
    const [movedItem] = properties.splice(from, 1);
    properties.splice(to, 0, movedItem);
    $propertyEditorStore.properties = properties;
    $propertyEditorStore = $propertyEditorStore;
  }

  async function onTypeExtensionChange(e: CustomEvent) {
    if (e.detail && collection) {
      if (derivedCollections.length > 0) {
        confirmationNotification.notify({
          message: `**${derivedCollections.length} collection(s)** are derived from this collection. This collection cannot extend another collection.`,
          title: "Cannot extend collection",
          type: AlertType.ERROR
        });
        isTypeExtension = false;
      }
    } else if (e.detail === false) {
      $propertyEditorStore.typeToExtend = undefined;
    }
  }

  function searchForTypeExtension(searchQuery: string) {
    return collectionStore.selectMany({
      filters: {
        type: CollectionType.TYPED
      },
      search: {
        query: searchQuery,
        properties: ["label"]
      }
    });
  }

  function onGotoBase() {
    if (!$propertyEditorStore.typeToExtend?.id) return;
    onGoto(
      $propertyEditorStore.typeToExtend.id,
      $propertyEditorStore.typeToExtend.label
    );
  }

  function onGoto(id: IRecordId, label?: string) {
    confirmationNotification.notify({
      message: `You are about to redirect to **${label ?? "Untitled"}** collection. Please save your changes before proceeding.`,
      title: "Save changes",
      type: AlertType.WARNING,
      confirmAction: {
        label: "Save & proceed",
        callback: async () => {
          await onSave();
          modalEvent.hide(propertiesEditAction);
          appStore.openResource(id, ResourceAccessMode.POP);
          return true;
        }
      }
    });
  }

  async function onSave() {
    if (
      $propertyEditorStore.properties.some(
        (p) =>
          p.type === PropertyType.UNIVERSAL &&
          (!p.config?.type || p.config?.type === UniversalPropertyType.NONE)
      )
    ) {
      return {
        error: `Please select a sub type for all Universal properties`
      };
    }
    return collection?.updateProperties();
  }
</script>

<div class="flex flex-col justify-between gap-4 w-full h-full text-b2">
  <div class="flex flex-col gap-8 flex-grow">
    <Text content={resolveTitle(collection)} style={TextStyle.PANEL_HEADING} />
    <div class="flex flex-col items-start w-full flex-grow gap-6">
      <div class="flex flex-col items-start w-full gap-3">
        <SwitchInput
          label={{
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
          on:change={onTypeExtensionChange}
        />
        {#if isTypeExtension}
          <div class="flex flex-col items-start w-full gap-2">
            <SearchSingleSelect
              bind:selected={$propertyEditorStore.typeToExtend}
              searchCallback={searchForTypeExtension}
              on:select={onTypeExtensionChange}
              placeholder="Search for a collection to extend"
            />
            <div class="flex items-center gap-2">
              <div class="text-b2 text-fgs3">
                Inherited properties: {$propertyEditorStore.typeToExtend
                  ?.properties?.length ?? 0}
              </div>
              {#if $propertyEditorStore.typeToExtend?.properties && $propertyEditorStore.typeToExtend?.properties?.length > 0}
                <Button
                  label={`Go to ${$propertyEditorStore.typeToExtend?.label}`}
                  size={Size.xs}
                  isUnderlined={true}
                  style={ButtonStyle.PLAIN}
                  on:click={onGotoBase}
                />
              {/if}
            </div>
          </div>
        {/if}
        {#if derivedCollections.length > 0}
          <div class="flex flex-col items-start w-full gap-2">
            <Text
              content="Derived collections"
              style={TextStyle.SECTION_HEADING}
            />
            <div class="flex items-center flex-wrap w-full gap-2">
              {#each derivedCollections as collection}
                <button
                  class="flex items-center gap-2 hover:text-aps1 px-2 py-0.5 border border-brs3 hover:border-aps1 rounded-md"
                  on:click={() => {
                    onGoto(collection.id, collection.label);
                  }}
                >
                  <CollectionTitleLabelPart item={collection} />
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      <div class="flex flex-col items-start w-full gap-2 flex-grow">
        <Text content="Properties" style={TextStyle.SECTION_HEADING} />
        <Table3
          id={tableId}
          isStyled={true}
          width="min-w-[60rem]"
          addAction="add property"
          actions={[
            { action: TableCellDefaultAction.REMOVE, index: 0 },
            { action: TableCellDefaultAction.REORDER, index: 1 }
          ]}
          {columns}
          bind:data={$propertyEditorStore.properties}
          on:add={onAdd}
          on:reorder={onReorder}
        />
      </div>
    </div>
  </div>
  <ModalFooter
    action={propertiesEditAction}
    primaryAction={collection
      ? {
          label: "Save",
          callback: onSave
        }
      : {
          label: "Done"
        }}
    secondaryAction={collection
      ? {
          label: "Cancel"
        }
      : undefined}
  />
</div>

<ComponentBaseLayer hasDragAndDrop={true} />
