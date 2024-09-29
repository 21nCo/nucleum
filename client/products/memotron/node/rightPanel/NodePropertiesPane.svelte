<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import PropertiesListView from "$lib/client/products/memotron/collection/properties/PropertiesListView.svelte";
  import type { IActiveNodeStore } from "$lib/client/products/memotron/node/node.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { ICollectionExpanded } from "../../collection/collection.type";
  import { onMount } from "svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { MemotronAction } from "../../memotronAction.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  export let node: IActiveNodeStore;
  export let isVisibleProps: boolean = false;
  let _types: ICollectionExpanded[] | null = null;
  let types: ICollectionExpanded[] = [];
  let refreshId: number = new Date().getTime();

  async function propagateChanges(e: CustomEvent) {
    if (!e.detail || !e.detail?.id || e.detail?.value === undefined) return;
    node.updateProperty({
      id: e.detail.id,
      value: e.detail.value
    });
  }

  onMount(() => {
    if (!isVisibleProps) {
      resolveTypes();
    } else {
      _types = $node.types ?? [];
    }
  });

  function resolveTypes() {
    if ($node.types?.length === 1) {
      const type = $node.types[0];
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
        types = [
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
      const allTypes = $node.types;
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
      types = [...(allTypes ?? []), ...(extendedTypes ?? [])];
      types = types.filter(
        (x, i) => types.findIndex((y) => isSameResource(x, y)) === i
      );
    }
    if (types.length > 0) {
      _types = [types[0]];
    }
  }

  function handleTypeChange(e: CustomEvent) {
    const type = types.find((x) => x.id.toString() === e.detail);
    if (type) {
      _types = [type];
      refreshId = new Date().getTime();
    }
  }
</script>

<div class="flex flex-col gap-12 w-full h-full">
  {#if !isVisibleProps && types.length > 0}
    <OptionSelector
      options={types.map((x) => ({
        label: x.label,
        value: x.id.toString(),
        icon: x.avatar
      }))}
      size={Size.sm}
      selected={types[0].id.toString()}
      on:select={handleTypeChange}
    />
  {/if}
  <div class="w-full h-full overflow-auto">
    {#if _types && _types.length > 0}
      {#key refreshId}
        <PropertiesListView
          bind:values={$node.properties}
          types={_types}
          context={isVisibleProps ? "mainpanel" : "rightpanel"}
          isIncludeExtendedProperties={isVisibleProps}
          isReadMode={!$isInEditMode}
          nodeId={$node.id}
          on:change={propagateChanges}
          on:showAll
        />
        {#if !isVisibleProps && _types.length === 1}
          <div class="flex justify-center mt-6">
            <Button
              label="Edit type"
              style={ButtonStyle.OUTLINED}
              type={ButtonVariant.SECONDARY}
              size={Size.xs}
              icon="ph:pencil-simple-line-light"
              isPreventMinWidth={true}
              on:click={() => {
                appStore.runAction(MemotronAction.EDIT_COLLECTION_PROPERTIES, {
                  componentParams: {
                    id: _types?.[0]?.id ?? ""
                  }
                });
              }}
            />
          </div>
        {/if}
      {/key}
    {:else if !isVisibleProps}
      <div class="flex w-full h-full items-center justify-center">
        <EmptyStatusView
          size={Size.sm}
          mainText="No properties found."
          subText="Add this node to a typed collection to see properties."
        />
      </div>
    {/if}
  </div>
  {#if !isVisibleProps}
    <ScrollViewBottomSpacer />
  {/if}
</div>
