<script lang="ts">
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { type IProperty, PropertyType } from "../property.type";
  import EndText from "./EndText.svelte";
  import RatingPropertyConfig from "./RatingPropertyConfig.svelte";
  import SelectPropertyConfig from "./selectProperty/SelectPropertyConfig.svelte";
  import UniversalPropertyConfig from "./universalProperty/UniversalPropertyConfig.svelte";
  export let row: IProperty;
  let dev_isEnableDefaultSelection: boolean = false;
  let isPopoverOpen: boolean = false;
  let propertyTypesWithConfiguration = [
    PropertyType.SINGLE_SELECT,
    PropertyType.MULTI_SELECT,
    PropertyType.RATING,
    PropertyType.UNIVERSAL
  ];
</script>

{#if propertyTypesWithConfiguration.includes(row.type)}
  <div
    class={cn("rounded-md w-full border flex items-center", {
      "border-aps1": isPopoverOpen,
      "border-brs3": !isPopoverOpen
    })}
  >
    {#if row.type === PropertyType.SINGLE_SELECT || row.type === PropertyType.MULTI_SELECT}
      <SelectPropertyConfig property={row} bind:isPopoverOpen />
    {:else if row.type === PropertyType.UNIVERSAL}
      <UniversalPropertyConfig property={row} bind:isPopoverOpen />
    {:else if row.type === PropertyType.RATING}
      <RatingPropertyConfig property={row} />
    {:else if row.type === PropertyType.CHECKBOX && dev_isEnableDefaultSelection && (typeof row.default === "boolean" || row.default === null || row.default === undefined)}
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
