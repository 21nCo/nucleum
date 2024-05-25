<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/elements/ScrollViewBottomSpacer.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import type { NodeProperty } from "$lib/client/types/memotron/node.type";
  import PropertiesListView from "../../common/properties/PropertiesListView.svelte";
  import { mapPropertyValues } from "../../common/properties/property.utils";
  import { resolveActiveNodeStore } from "../node.store";
  export let id: string;
  const node = resolveActiveNodeStore(id);

  let properties = $node?.type?.properties;
  let nodeProperties: NodeProperty[] = mapPropertyValues(
    properties,
    $node.properties
  );
</script>

<div class="w-full h-full">
  {#if properties && nodeProperties && properties.length > 0 && nodeProperties.length > 0}
    <PropertiesListView
      properties={nodeProperties}
      type={$node.type}
      isPropertiesPaneContext={true}
      isReadMode={!$isInEditMode}
      nodeId={id}
    />
  {/if}
  <ScrollViewBottomSpacer />
</div>
