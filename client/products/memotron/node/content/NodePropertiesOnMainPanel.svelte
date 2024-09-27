<script lang="ts">
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import PropertiesListView from "../../collection/properties/PropertiesListView.svelte";
  import type { IProperty } from "../../collection/properties/property.type";
  import { mapPropertyValues } from "../../collection/properties/property.utils";
  import type { IActiveNodeStore } from "../node.store";
  export let node: IActiveNodeStore;
  export let propertiesOnMainPanel: IProperty[];
  export let isMediaNode: boolean = false;

  $: nodeProperties = mapPropertyValues(
    propertiesOnMainPanel,
    $node.properties
  );

  async function propagateChanges(e: CustomEvent) {
    const remainingProperties = $node.properties?.filter(
      (x) => !nodeProperties.some((y) => isSameResource(y, x))
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
    propertyConfig={$node?.propertyConfig}
    on:change={propagateChanges}
    context={isMediaNode ? "medianode" : "nodepage"}
    on:showAll
  />
{/if}
