<script lang="ts">
  import Divider from "$lib/client/elements/Divider.svelte";
  import type { TreeMapContent } from "$lib/client/types/treeMap.type";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import TreeMapItem from "./TreeMapItem.svelte";
  export let items: string[] = [];
  export let contentCallback: (id: string) => TreeMapContent;
  export let childrenCallback: (id: string) => string[];
</script>

{#if isValidArrayWithData(items)}
  <div class="w-full h-full">
    {#each items as item}
      <TreeMapItem id={item} {contentCallback} {childrenCallback} on:click />
      <!-- <Divider /> -->
    {/each}
  </div>
{/if}
