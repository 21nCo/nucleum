<script lang="ts">
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import type { ICollectionView } from "$lib/client/types/memotron/curation.type";
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { resolvePropertyOptions } from "../curation.utils";
  export let view: ICollectionView;
  export let properties: IProperty[] | null = null;
  export let value: string;
  let tabs: ISelectItem[] = [];
  $: tabs = resolveTabs(view.tabBy);
  $: label = resolveLabel(view.tabBy);
  function resolveTabs(tabBy: string) {
    if (view.tabs) return view.tabs;
    return resolvePropertyOptions(tabBy, properties);
  }
  function resolveLabel(tabBy: string) {
    if (!view.tabBy || !properties) return "";
    const property = properties.find((p) => p.id === tabBy);
    return property?.label ?? "";
  }
  $: console.log("tabs", { tabs, properties, view });
</script>

{#if label && tabs}
  <div class="flex gap-2 items-center">
    <span class="text-fgs2 text-b2 min-w-fit whitespace-nowrap"
      >{label + ":"}</span
    >
    {#if tabs && tabs.length > 0}
      <OptionSelector options={tabs} size={Size.sm} bind:selected={value} />
    {/if}
  </div>
{/if}
