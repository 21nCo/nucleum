<script lang="ts">
  import type { ICollectionView } from "$lib/client/types/memotron/curation.type";
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import NodeItems from "../../../common/NodeItems.svelte";
  import { resolvePropertyOptions } from "../../curation.utils";
  import BoardPane from "./BoardPane.svelte";
  export let view: ICollectionView;
  export let properties: IProperty[] | null = null;
  export let isBoardOverflow = false;

  $: groups = resolveBoards(view.groupBy);
  function resolveBoards(id: string) {
    // if (view.groups) return view.groups;
    return resolvePropertyOptions(id, properties);
  }
  function filterGroupData(group: string) {
    return view.data?.filter((node) => {
      return (
        node.properties?.find((p) => p.id === view.groupBy)?.value === group
      );
    });
  }
</script>

{#if isValidArrayWithData(groups)}
  <div class="w-full h-full flex overflow-x-auto overflow-y-hidden gap-4">
    {#each groups as group}
      <BoardPane
        {view}
        {group}
        {isBoardOverflow}
        {properties}
        data={filterGroupData(group.value)}
      />
    {/each}
  </div>
{:else}
  <NodeItems nodes={view.data} arrangement={view.arrangement} />
{/if}
