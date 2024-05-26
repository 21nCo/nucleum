<script lang="ts">
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import type { ICollectionView } from "$lib/client/types/memotron/curation.type";
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import type { SelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  export let view: ICollectionView;
  export let properties: IProperty[] | null = null;
  export let value: string;
  let tabs: SelectItem[] = resolveTabs();
  function resolveTabs() {
    if (!view.tabBy) return [];
    if (view.tabs) return view.tabs;
    if (!properties) return [];
    const property = properties.find((p) => p.id === view.tabBy);
    if (!property?.config?.options) return [];
    return property.config.options.map((option) => ({
      value: option.id,
      label: option.label
    }));
  }
  $: console.log("tabs", tabs);
</script>

{#if tabs && tabs.length > 0}
  <OptionSelector options={tabs} size={Size.sm} bind:selected={value} />
{/if}
