<script lang="ts">
  import type { ICollectionView } from "$lib/client/products/memotron/collection/collection.type";
  import type { INodeThumb } from "$lib/client/products/memotron/node/node.type";
  import type { ISelectValue } from "$lib/client/types/select.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import BoardPane from "./BoardPane.svelte";
  import { resolvePropertyOptions } from "../../curation/curation.utils";
  import NodeItems from "../NodeItems.svelte";
  import type { IProperty } from "../properties/property.type";
  export let view: ICollectionView;
  export let data: INodeThumb[] = [];
  export let properties: IProperty[] = [];
  export let isBoardOverflow = false;
  export let isInEditMode = false;

  $: groups = resolveBoards(view.groupBy, properties);

  function resolveBoards(id: string, properties: IProperty[]) {
    // if (view.groups) return view.groups;
    return resolvePropertyOptions(id, properties);
  }
  function filterGroupData(group: ISelectValue) {
    return data?.filter((node: INodeThumb) => {
      return (
        node.properties?.find((p) => p.id === view.groupBy)?.value === group
      );
    });
  }
  // $: console.log({ groups, properties: $properties, view });
</script>

{#if isValidArrayWithData(groups)}
  <div class="w-full h-full flex overflow-x-auto overflow-y-hidden gap-4">
    {#each groups as group}
      <BoardPane
        {view}
        {isInEditMode}
        {group}
        {isBoardOverflow}
        {properties}
        data={filterGroupData(group.value)}
      />
    {/each}
  </div>
{:else if !isInEditMode}
  <NodeItems
    nodes={data}
    arrangement={view.arrangement}
    density={view.density}
  />
{/if}
