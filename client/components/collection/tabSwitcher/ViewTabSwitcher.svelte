<script lang="ts">
  import {
    isNoneResource,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  import {
    calculateGroupingCounts,
    resolveOptionsForGrouping
  } from "@21n/components/collection/collection.utils";
  import type { ICollectionView } from "@21n/components/collection/collection.type";
  import type {
    ISelectItem,
    ISelectValue
  } from "@21n/types/select.type";
  import type { IProperty } from "@21n/components/collection/properties/property.type";
  import ViewTabs from "@21n/components/collection/tabSwitcher/ViewTabs.svelte";

  export let view: ICollectionView;
  export let properties: IProperty[] = [];
  export let value: ISelectValue | undefined = undefined;
  let tabs: ISelectItem[] = [];
  $: label = resolveLabel(view.tabBy);
  $: tabCounts = calculateGroupingCounts(view.data || [], view.tabBy);
  $: tabs = resolveTabs(view.tabBy);

  function resolveTabs(tabBy: string) {
    if (isNoneResource(tabBy)) return [];
    if (view.tabs) return view.tabs;
    const allTab = {
      label: "All",
      value: "all"
    };
    const options = resolveOptionsForGrouping(tabBy, properties, tabCounts);
    return [allTab, ...options];
  }
  function resolveLabel(tabBy: string) {
    if (!view.tabBy || !properties) return "";
    const property = properties.find(resourceInList(tabBy));
    return property?.label ?? "";
  }
</script>

{#if label && tabs}
  <div
    class="flex mo:flex-col mo:items-start mo:gap-2 gap-4 items-center w-full"
  >
    <span class="text-fgs2 text-b2 min-w-fit whitespace-nowrap">{label}</span>
    {#if tabs && tabs.length > 0}
      <ViewTabs {tabs} bind:selected={value} {tabCounts} on:select />
    {/if}
  </div>
{/if}
