<script lang="ts">
  import type { NodeProperty } from "$lib/tidy/types/memotron/node.type";
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
  let nodeProperties: NodeProperty[] = mapPropertyValues(
    propertiesOnMainPanel,
    $node.properties
  );
</script>

{#if propertiesOnMainPanel && nodeProperties && propertiesOnMainPanel.length > 0 && nodeProperties.length > 0}
  <PropertiesListView properties={nodeProperties} type={$node.type} />
{/if}
