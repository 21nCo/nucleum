<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import PropertiesListView from "$lib/client/components/collection/properties/PropertiesListView.svelte";
  import type { IActiveNodeStore } from "$lib/client/products/memotron/node/node.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import {
    removeDuplicatesFilter,
    resourceAction
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { ICollectionExpanded } from "$lib/client/components/collection/collection.type";
  import { onMount } from "svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import ResourceStatusBanner from "$lib/client/components/record/RecordStatusBanner.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IActiveGoalStore } from "../../goals/goal.store";

  export let item: IActiveNodeStore | IActiveGoalStore;
  export let resource: Resource;
  export let isVisibleProps: boolean = false;
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
              icon="ph:pencil-simple-line-light"
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
  subscribeToResource={new Set([Resource.collection])}
  subscribeToRecords={$item.types?.map((x) => x.id) ?? []}
  on:change={refreshTypeData}
/>
