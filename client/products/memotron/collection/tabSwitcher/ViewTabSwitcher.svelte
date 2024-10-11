<script lang="ts">
  import {
    isNoneResource,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import type { ICollectionView } from "$lib/client/products/memotron/collection/collection.type";
  import type {
    ISelectItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import type { IProperty } from "../properties/property.type";
  import { resolvePropertyOptions } from "../properties/property.utils";
  import ViewTabs from "./ViewTabs.svelte";

  export let view: ICollectionView;
  export let properties: IProperty[] = [];
  export let value: ISelectValue | undefined = undefined;
  let tabs: ISelectItem[] = [];
  $: tabs = resolveTabs(view.tabBy);
  $: label = resolveLabel(view.tabBy);
  function resolveTabs(tabBy: string) {
    if (isNoneResource(tabBy)) return [];
    if (view.tabs) return view.tabs;
    return [
      {
        label: "All",
        value: "all"
      },
      ...resolvePropertyOptions(tabBy, properties)
    ];
  }
  function resolveLabel(tabBy: string) {
    if (!view.tabBy || !properties) return "";
    const property = properties.find(resourceInList(tabBy));
    return property?.label ?? "";
  }
</script>

{#if label && tabs}
  <div class="flex gap-4 items-center">
    <span class="text-fgs2 text-b2 min-w-fit whitespace-nowrap"
      >{label + ":"}</span
    >
    {#if tabs && tabs.length > 0}
      <!-- <OptionSelector
        options={tabs}
        size={Size.sm}
        bind:selected={value}
        on:select
      /> -->
      <ViewTabs {tabs} bind:selected={value} on:select />
    {/if}
  </div>
{/if}
