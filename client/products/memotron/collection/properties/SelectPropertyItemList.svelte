<script lang="ts">
  import type { PropertyConfigOption } from "$lib/client/types/memotron/type.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import SelectPropertyItem from "./SelectPropertyItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let options: PropertyConfigOption[];
  export let groupId: string | undefined = undefined;
  export let groupLabel: string | undefined = undefined;
  $: filtered = resolveItems(groupId);
  function resolveItems(groupId: string | undefined) {
    return options.filter((x) => x.groupId === groupId);
  }
</script>

{#if isValidArrayWithData(filtered)}
  <div class="flex flex-col w-full">
    {#if groupId && groupLabel}
      <div class="flex gap-1 text-b3 text-fgs3 px-3 mb-1">
        {groupLabel}
      </div>
    {/if}
    {#each filtered as item}
      <SelectPropertyItem
        {item}
        on:click={() => {
          dispatch("select", item.id);
        }}
      />
    {/each}
  </div>
{/if}
