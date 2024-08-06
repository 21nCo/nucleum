<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import PropertiesListView from "$lib/client/products/memotron/collection/properties/PropertiesListView.svelte";
  import { mapPropertyValues } from "$lib/client/products/memotron/collection/properties/property.utils";
  import NodeMetadataPane from "$lib/client/products/memotron/node/metadata/NodeMetadataPane.svelte";
  import type { IActiveNodeStore } from "$lib/client/products/memotron/node/node.store";
  import Divider from "$lib/client/elements/Divider.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let node: IActiveNodeStore;
  export let isMediaNode: boolean = false;
  $: nodeProperties = mapPropertyValues(
    $node?.propertyConfig,
    $node.properties
  );
  async function propagateChanges(e: CustomEvent) {
    console.log({ e, nodeProperties });
    const remainingProperties = $node.properties?.filter(
      (x) => !nodeProperties.some((y) => y.id === x.id)
    );
    await node.updateProperties([
      ...(remainingProperties ?? []),
      ...nodeProperties
    ]);
  }
</script>

<div class="flex flex-col gap-12 w-full flex-grow">
  <div class="w-full">
    {#if nodeProperties && nodeProperties.length > 0}
      <PropertiesListView
        bind:properties={nodeProperties}
        types={$node.types}
        context={isMediaNode ? "medianode" : "rightpanel"}
        isReadMode={!$isInEditMode}
        nodeId={$node.id}
        on:change={propagateChanges}
      />
    {:else}
      <div class="flex w-full h-40">
        <EmptyStatusView
          size={Size.sm}
          mainText="No properties found."
          subText="Add this node to a typed collection to see properties."
        />
      </div>
    {/if}
  </div>
  {#if !isMediaNode}
    <div class="flex flex-col gap-3 w-full">
      <Divider />
      <NodeMetadataPane {node} />
    </div>
  {/if}
  <ScrollViewBottomSpacer />
</div>
