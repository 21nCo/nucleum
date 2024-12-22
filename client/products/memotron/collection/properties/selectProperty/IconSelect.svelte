<script lang="ts">
  import { type IPropertyConfigOption } from "../property.type";
  import { resolveSelectPropertySelection } from "../property.utils";
  import IconSelectOption from "./IconSelectOption.svelte";
  export let options: IPropertyConfigOption[];
  export let value: string | string[] | null = null;
  export let isMultiSelect: boolean | undefined = undefined;
  export let onSelect: (value: string | string[]) => void;
</script>

<div class="flex flex-wrap gap-2">
  {#each options as option}
    <IconSelectOption
      {option}
      {value}
      on:click={() => {
        const val = option.id;
        value = resolveSelectPropertySelection(value, val, { isMultiSelect });
        console.log({ value });
        onSelect(value);
      }}
    />
  {/each}
</div>
