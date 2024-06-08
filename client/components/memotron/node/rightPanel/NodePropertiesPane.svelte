<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import type { INodeProperty } from "$lib/client/types/memotron/node.type";
  import PropertiesListView from "../../common/properties/PropertiesListView.svelte";
  import { mapPropertyValues } from "../../common/properties/property.utils";
  import { resolveActiveNodeStore } from "../node.store";
  export let id: string;
  const node = resolveActiveNodeStore(id);

  let properties = $node?.type?.properties;
  let nodeProperties: INodeProperty[] = mapPropertyValues(
    properties,
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
  {#if properties && nodeProperties && properties.length > 0 && nodeProperties.length > 0}
    <PropertiesListView
      bind:properties={nodeProperties}
      type={$node.type}
      isPropertiesPaneContext={true}
      isReadMode={!$isInEditMode}
      nodeId={id}
      on:change={propagateChanges}
    />
  {/if}
  <ScrollViewBottomSpacer />
</div>
