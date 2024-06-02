<script lang="ts">
  import type { INodeProperty } from "$lib/client/types/memotron/node.type";
  import PropertiesListView from "../common/properties/PropertiesListView.svelte";
  import {
    mapPropertyValues,
    resolvePropertyDefaultValue
  } from "../common/properties/property.utils";
  import { resolveActiveNodeStore } from "./node.store";
  export let id: string;
  const node = resolveActiveNodeStore(id);

  let propertiesOnMainPanel = $node?.type?.properties?.filter(
    (x) => x.isShowOnNodePage
  );
  let nodeProperties: INodeProperty[] = mapPropertyValues(
    propertiesOnMainPanel,
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

{#if propertiesOnMainPanel && nodeProperties && propertiesOnMainPanel.length > 0 && nodeProperties.length > 0}
  <PropertiesListView
    bind:properties={nodeProperties}
    type={$node.type}
    on:change={propagateChanges}
  />
{/if}
