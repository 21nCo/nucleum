<script lang="ts">
  import PropertiesListView from "../../collection/properties/PropertiesListView.svelte";
  import { mapPropertyValues } from "../../collection/properties/property.utils";
  import type { IActiveNodeStore } from "../node.store";
  export let node: IActiveNodeStore;
  export let isMediaNode: boolean = false;
  $: propertiesOnMainPanel = $node?.propertyConfig?.filter(
    (x) => x.isShowOnNodePage
  );
  $: nodeProperties = mapPropertyValues(
    propertiesOnMainPanel,
    $node.properties
  );

  async function propagateChanges(e: CustomEvent) {
    const remainingProperties = $node.properties?.filter(
      (x) => !nodeProperties.some((y) => y.id === x.id)
    );
    await node.updateProperties([
      ...(remainingProperties ?? []),
      ...nodeProperties
    ]);
  }
</script>

{#if propertiesOnMainPanel && nodeProperties && propertiesOnMainPanel.length > 0 && nodeProperties.length > 0}
  <PropertiesListView
    bind:properties={nodeProperties}
    types={$node.types}
    on:change={propagateChanges}
    context={isMediaNode ? "medianode" : "nodepage"}
  />
{/if}
