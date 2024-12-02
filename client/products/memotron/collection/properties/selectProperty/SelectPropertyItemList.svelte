<script lang="ts">
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import type { PropertyConfigOption } from "../property.type";
  import SelectPropertyItem from "./SelectPropertyItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let options: PropertyConfigOption[];
  export let groupId: string | undefined = undefined;
  export let groupLabel: string | undefined = undefined;
  export let isPreventDefaultGroupLabel = false;
  $: filtered = resolveItems(groupId);
  function resolveItems(groupId: string | undefined) {
    if (groupId) {
      return options.filter((x) => x.groupId === groupId);
    } else {
      groupLabel = "Ungrouped";
      return options.filter((x) => !x.groupId);
    }
  }
</script>

{#if isValidArrayWithData(filtered)}
  <div class="flex flex-col w-full">
    {#if !isPreventDefaultGroupLabel}
      <div class="flex gap-1 text-b3 text-fgs3 px-3 mb-1">
        {groupLabel}
      </div>
    {/if}

    {#each filtered as item (item.id)}
      <SelectPropertyItem
        {item}
        on:click={() => {
          dispatch("select", item.id);
        }}
      />
    {/each}
  </div>
{/if}
