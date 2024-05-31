<script lang="ts">
  import type { ICollectionView } from "$lib/client/types/memotron/curation.type";
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import NodeItems from "../../../common/NodeItems.svelte";
  import { resolvePropertyOptions } from "../../curation.utils";
  export let view: ICollectionView;
  export let data: any;
  export let properties: IProperty[] | null = null;
  $: subGroups = resolveBoards(view.subGroupBy);
  function resolveBoards(id: string) {
    // if (view.groups) return view.groups;
    return resolvePropertyOptions(id, properties);
  }
  function filterSubGroupData(subGroup: string) {
    return view.data?.filter((node) => {
      return (
        node.properties?.find((p) => p.id === view.subGroupBy)?.value ===
        subGroup
      );
    });
  }
  $: console.log({ groups: subGroups });
</script>

<div
  class="border border-brs3 rounded-md h-full w-[28rem] min-w-[20rem] overflow-auto p-2"
>
  {#if isValidArrayWithData(subGroups)}
    <div class="w-full flex flex-col gap-4">
      <NodeItems
        nodes={filterSubGroupData(data)}
        arrangement={view.arrangement}
      />
    </div>
  {:else}
    <NodeItems nodes={data} arrangement={view.arrangement} />
  {/if}
</div>
