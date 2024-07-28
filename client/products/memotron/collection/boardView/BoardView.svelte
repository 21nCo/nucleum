<script lang="ts">
  import type { ICollectionView } from "$lib/client/products/memotron/collection/collection.type";
  import type { INodeThumbnail } from "$lib/client/products/memotron/node/node.type";
  import type { ISelectValue } from "$lib/client/types/select.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import BoardPane from "./BoardPane.svelte";
  import { resolvePropertyOptions } from "../../curation/curation.utils";
  import NodeItems from "../NodeItems.svelte";
  import { liveQuery } from "dexie";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import type { IProperty } from "../properties/property.type";
  export let view: ICollectionView;
  export let data: INodeThumbnail[] = [];
  export let propertyIds: string[] = [];
  export let isBoardOverflow = false;
  let properties = liveQuery(() =>
    $dataManager.cacheSource.dexie.property
      .where("id")
      .anyOfIgnoreCase(propertyIds)
      .toArray()
  );

  $: groups = resolveBoards(view.groupBy, $properties);

  function resolveBoards(id: string, properties: IProperty[]) {
    // if (view.groups) return view.groups;
    return resolvePropertyOptions(id, properties);
  }
  function filterGroupData(group: ISelectValue) {
    return data?.filter((node: INodeThumbnail) => {
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
        {group}
        {isBoardOverflow}
        properties={$properties}
        data={filterGroupData(group.value)}
      />
    {/each}
  </div>
{:else}
  <NodeItems nodes={data} arrangement={view.arrangement} />
{/if}
