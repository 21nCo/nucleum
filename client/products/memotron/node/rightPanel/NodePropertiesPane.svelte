<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import PropertiesListView from "../../collection/properties/PropertiesListView.svelte";
  import { mapPropertyValues } from "../../collection/properties/property.utils";
  import type { IActiveNodeStore } from "../node.store";
  export let node: IActiveNodeStore;

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

<div class="w-full h-full">
  {#if nodeProperties && nodeProperties.length > 0}
    <PropertiesListView
      bind:properties={nodeProperties}
      types={$node.types}
      context="rightpanel"
      isReadMode={!$isInEditMode}
      nodeId={$node.id}
      on:change={propagateChanges}
    />
  {/if}
  <ScrollViewBottomSpacer />
</div>
