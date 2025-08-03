<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type {
    IResourceSwitchItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import ResourceSwitcherItem from "./ResourceSwitcherItem.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/products/product.type";
  import { resolveProductConfig } from "$lib/client/products/product.config";
  import { resolveResourceSwitcher } from "../../flux/resourceStores/resource.utils";
  const dispatch = createEventDispatcher();
  export let resources: Resource[] = [];
  export let selected: ISelectValue | undefined = undefined;
  export let parentBgIndex: number = 1;
  export let isShowCount: boolean = false;

  const resourceList: IResourceSwitchItem[] = resolveResourceSwitcher();

  let options: IResourceSwitchItem[] = [];

  $: options = resources.map((x) => {
    const resource = resourceList.find((y) => y.value === x);
    if (!resource) return { label: x, value: x, icon: "circle" };
    return resource;
  });

  let sections = [
    Product.NUCLEUS,
    Product.POINTRON,
    Product.MEMOTRON
    // Product.SELFTRON
    // Product.FEEDTRON,
    // Product.HOMETRON,
    // Product.FINATRON,
    // Product.FELLOTRON
  ];
  if (selected === undefined) selected = options[0]?.value;

  function resolveResourcesForSection(section: Product) {
    const resources = resolveProductConfig(section).resources;
    return resources
      .map((x) => resourceList.find((y) => y.value === x))
      .filter((x) => x !== undefined);
  }

  function resolveSectionLabel(section: Product) {
    return resolveProductConfig(section).sectionLabel;
  }
</script>

{#if $appStore.product === Product.NUCLEUS}
  <div class="flex flex-col gap-6 w-full overflow-y-auto">
    {#each sections as section (section)}
      <div class="flex flex-col gap-2">
        {#if section !== Product.NUCLEUS}
          <div class="text-fgs3 text-b2">
            {resolveSectionLabel(section)}
          </div>
        {/if}
        <div
          class="w-full grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] mo:mb-1 gap-3"
        >
          {#each resolveResourcesForSection(section) as item, index (item.value)}
            <ResourceSwitcherItem
              {item}
              {isShowCount}
              {parentBgIndex}
              isActive={selected === item.value}
              on:click={() => {
                if (item.isDisabled) return;
                selected = item.value;
                dispatch("select", item.value);
              }}
            />
          {/each}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div
    class="w-full grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] mo:mb-1 gap-3"
  >
    {#each options as item, index (item.value)}
      <ResourceSwitcherItem
        {item}
        {isShowCount}
        {parentBgIndex}
        isActive={selected === item.value}
        on:click={() => {
          if (item.isDisabled) return;
          selected = item.value;
          dispatch("select", item.value);
        }}
      />
    {/each}
  </div>
{/if}
