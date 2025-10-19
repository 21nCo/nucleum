<script lang="ts">
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import type { IPropertyConfigOption } from "@21n/components/collection/properties/property.type";
  import SelectPropertyOption from "@21n/components/collection/properties/selectProperty/SelectPropertyOption.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let options: IPropertyConfigOption[];
  export let value: string | string[];
  export let isMultiSelect: boolean = false;
  export let groupId: string | undefined = undefined;
  export let groupLabel: string | undefined = undefined;
  export let isPreventDefaultGroupLabel = false;
  export let isPreventTagStyle: boolean = false;

  $: filtered = resolveItems(groupId);
  function resolveItems(groupId: string | undefined) {
    if (groupId) {
      return options.filter((x) => x.groupId === groupId);
    } else {
      groupLabel = groupLabel ?? "Ungrouped";
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
      <SelectPropertyOption
        {item}
        {isPreventTagStyle}
        isSelected={isMultiSelect &&
          isValidArrayWithData(value) &&
          value.includes(item.id)}
        on:click={() => {
          dispatch("select", item.id);
        }}
      />
    {/each}
  </div>
{/if}
