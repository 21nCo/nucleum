<script lang="ts">
  import {
    PropertyType,
    type Property
  } from "$lib/client/types/memotron/type.type";
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import EndText from "./EndText.svelte";
  import RatingPropertyConfig from "./RatingPropertyConfig.svelte";
  import SelectPropertyConfig from "./selectProperty/SelectPropertyConfig.svelte";
  export let row: Property;
  $: console.log({ row });
  let propertyTypesWithOptions = [
    PropertyType.SINGLE_SELECT,
    PropertyType.MULTI_SELECT,
    PropertyType.RATING,
    PropertyType.CHECKBOX
  ];
</script>

{#if propertyTypesWithOptions.includes(row.type)}
  <div
    class="bg-bgs2 rounded-md w-full border border-brs3 flex items-center px-2"
  >
    {#if row.type === PropertyType.SINGLE_SELECT || row.type === PropertyType.MULTI_SELECT}
      <SelectPropertyConfig property={row} />
    {:else if row.type === PropertyType.RATING}
      <RatingPropertyConfig property={row} />
    {:else if row.type === PropertyType.CHECKBOX && (typeof row.default === "boolean" || row.default === null || row.default === undefined)}
      <span class="flex items-center justify-between w-full">
        <CheckboxInput
          label={row.default ? "Checked" : "Unchecked"}
          bind:checked={row.default}
        />
        <EndText text="Default" />
      </span>
    {/if}
  </div>
{:else}
  <span class="flex w-full items-center text-fgs3 text-b2">NA</span>
{/if}
