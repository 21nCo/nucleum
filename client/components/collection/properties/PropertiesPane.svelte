<script lang="ts">
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "@21n/stores/app.store";
  import PropertiesListView from "@21n/components/collection/properties/PropertiesListView.svelte";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/types/size.enum";
  import {
    removeDuplicatesFilter,
    resourceAction
  } from "@21n/components/flux/resourceStores/resource.utils";
  import type { ICollectionExpanded } from "@21n/components/collection/collection.type";
  import { onMount } from "svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import ResourceStatusBanner from "@21n/components/record/RecordStatusBanner.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { collectionStore } from "@21n/components/collection/collection.store";
  import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
  import { cn } from "@21n/utils/ui.utils";
  import type { IActiveGoalStore } from "@21n/components/goals/goal.store";

  export let item: IActiveNodeStore | IActiveGoalStore;
  export let resource: Resource;
  export let isVisibleProps: boolean = false;
  export let parentBgIndex: number = 1;
  let _types: ICollectionExpanded[] | null = null;
  let multipleTypesList: ICollectionExpanded[] = [];
  let refreshId: number = new Date().getTime();

  $: isReadOnlyMode =
    $item.isInReadOnlyMode ||
    $item.isLocked ||
    $item.isArchived ||
    $item.trashInformation !== undefined;

  async function propagateChanges(e: CustomEvent) {
    if (!e.detail || !e.detail?.id || e.detail?.value === undefined) return;
    item.updateProperty({
      id: e.detail.id,
      value: e.detail.value
    });
  }

  onMount(() => {
    refresh();
  });

  function refresh() {
    if (!isVisibleProps) {
      resolveRenderedTypes();
    } else {
      _types = $item.types ?? [];
    }
  }
  async function refreshTypeData() {
    if (!$item.types) return;
    $item.types = await collectionStore.resolveTypes(
      $item.types.map((x) => x.id)
    );
    refresh();
    refreshId = new Date().getTime();
  }

  function resolveRenderedTypes() {
    if ($item.types?.length === 1) {
      const type = $item.types[0];
      type.properties = type.properties?.filter((x) => x);
      type.extendProperties = type.extendProperties?.filter((x) => x);
      if (
        type.properties &&
        type.properties.length === 0 &&
        type.extendProperties &&
        type.extendProperties?.length > 0
      ) {
        _types = [
          {
            ...type,
            properties: type.extendProperties
          }
        ];
      } else if (
        type.properties &&
        type.properties.length > 0 &&
        type.extendProperties &&
        type.extendProperties?.length > 0
      ) {
        multipleTypesList = [
          type,
          {
            ...type.typeToExtend,
            properties: type.extendProperties
          } as ICollectionExpanded
        ];
      } else if (type.properties && type.properties.length > 0) {
        _types = [type];
      }
    } else {
      const allTypes = $item.types;
      const extendedTypes: ICollectionExpanded[] = allTypes
        ?.map((x) => {
          if (x.typeToExtend) {
            return {
              ...x.typeToExtend,
              properties: x.extendProperties
            } as ICollectionExpanded;
          }
          return x;
        })
        .filter((x) => x) as ICollectionExpanded[];
      multipleTypesList = [...(allTypes ?? []), ...(extendedTypes ?? [])];
      multipleTypesList = multipleTypesList.filter(removeDuplicatesFilter);
    }
    if (multipleTypesList.length > 0) {
      _types = [multipleTypesList[0]];
    }
  }

  function handleTypeChange(e: CustomEvent) {
    const type = multipleTypesList.find((x) => x.id.toString() === e.detail);
    if (type) {
      _types = [type];
      refreshId = new Date().getTime();
    }
  }

  function onEditProperties() {
    appStore.runAction(
      resourceAction(Resource.property, ResourceActionType.EDIT),
      {
        componentParams: {
          id: _types?.[0]?.id ?? $item.types?.[0]?.id ?? ""
        }
      }
    );
  }
</script>

<div
  class={cn("flex flex-col gap-6 w-full", {
    "flex-grow": !isVisibleProps
  })}
>
  {#if !isVisibleProps && multipleTypesList.length > 0}
    <OptionSelector
      options={multipleTypesList.map((x) => ({
        label: x.label,
        value: x.id.toString(),
        icon: x.avatar
      }))}
      size={Size.sm}
      isShowExpandFeedbackOnActive={true}
      selected={multipleTypesList[0].id.toString()}
      on:select={handleTypeChange}
    />
  {/if}
  <div class="flex flex-col gap-6 w-full h-full overflow-auto">
    {#if !isVisibleProps}
      <ResourceStatusBanner resource={item} />
    {/if}
    {#if _types && _types.length > 0}
      {#key refreshId}
        <PropertiesListView
          bind:values={$item.properties}
          types={_types}
          {resource}
          context={isVisibleProps ? "mainpanel" : "rightpanel"}
          isIncludeExtendedProperties={isVisibleProps}
          {isReadOnlyMode}
          item={$item}
          {parentBgIndex}
          on:change={propagateChanges}
          on:showAll
        />
        {#if !isVisibleProps && !isReadOnlyMode && _types.length === 1}
          <div class="flex justify-center">
            <Button
              label="Edit"
              style={ButtonStyle.OUTLINED}
              type={ButtonVariant.SECONDARY}
              size={Size.xs}
              icon="edit"
              isPreventMinWidth={true}
              on:click={onEditProperties}
            />
          </div>
        {/if}
      {/key}
    {:else if !isVisibleProps}
      {@const typesPresent = $item.types && $item.types.length > 0}
      <div class="flex w-full h-full items-center justify-center">
        <EmptyStatusView
          size={Size.sm}
          mainText="No properties found."
          subText={typesPresent
            ? "Please edit properties to see them here."
            : "Add this node to a typed collection to see properties."}
          actionText={typesPresent ? "Edit properties" : undefined}
          on:click={onEditProperties}
        />
      </div>
    {/if}
    {#if !isVisibleProps}
      <ScrollViewBottomSpacer />
    {/if}
  </div>
</div>
<ComponentBaseLayer
  subscribeToRecords={$item.types?.map((x) => x.id) ?? []}
  on:change={refreshTypeData}
/>
<ComponentBaseLayer
  subscribeToRecords={[item.id]}
  subscriptionPropsForMergeAction={["collections"]}
  on:change={refreshTypeData}
/>
