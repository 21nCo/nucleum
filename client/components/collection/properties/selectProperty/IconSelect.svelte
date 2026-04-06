<script lang="ts">
  import { type IPropertyConfigOption } from "@21n/components/collection/properties/property.type";
  import { resolveSelectPropertySelection } from "@21n/components/collection/properties/property.utils";
  import IconSelectOption from "@21n/components/collection/properties/selectProperty/IconSelectOption.svelte";
  let {
    options,
    value = $bindable(null),
    isMultiSelect = undefined,
    onSelect
  }: {
    options: IPropertyConfigOption[];
    value?: string | string[] | null;
    isMultiSelect?: boolean | undefined;
    onSelect: (value: string | string[]) => void;
  } = $props();
</script>

<div class="flex flex-wrap gap-2">
  {#each options as option}
    <IconSelectOption
      {option}
      {value}
      onclick={() => {
        const val = option.id;
        value = resolveSelectPropertySelection(value, val, { isMultiSelect });
        onSelect(value);
      }}
    />
  {/each}
</div>
