<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type {
    IResourceSwitchItem,
    ISelectValue
  } from "@21n/types/select.type";
  import ResourceSwitcherItem from "@21n/components/library/resourceSwitcher/ResourceSwitcherItem.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { appStore } from "@21n/stores/app.store";
  import { Product } from "@21n/products/product.type";
  import { resolveProductConfig } from "@21n/products/product.config";
  import { resolveResourceSwitcher } from "@21n/components/flux/resourceStores/resource.utils";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  const dispatch = createEventDispatcher();
  export let resources: Resource[] = [];
  export let selected: ISelectValue | undefined = undefined;
  export let parentBgIndex: number = 1;
  export let isShowCount: boolean = false;

  const resourceList: IResourceSwitchItem[] = resolveResourceSwitcher();

  let options: IResourceSwitchItem[] = [];
  const isDev = import.meta.env.DEV;

  $: options = resources.map((x) => {
    const resource = resourceList.find((y) => y.value === x);
    if (!resource) return { label: x, value: x, icon: "circle" };
    return resource;
  });

  let sections = [
    Product.NUCLEUS,
    Product.POINTRON,
    Product.MEMOTRON,
    Product.SELFTRON,
    Product.FEEDTRON,
    Product.HOMETRON,
    Product.FINATRON,
    Product.FELLOTRON
  ];
  if (selected === undefined) selected = options[0]?.value;
  const nucleusResources = resolveProductConfig(Product.NUCLEUS).resources
    .browse;
  function resolveResourcesForSection(section: Product): IResourceSwitchItem[] {
    const resources = resolveProductConfig(section).resources.browse;
    return resources
      .map((x) => resourceList.find((y) => y.value === x))
      .filter((x) => isDev || !x?.isDisabled)
      .filter(
        (x) =>
          section === Product.NUCLEUS ||
          !nucleusResources.includes(x?.value as Resource)
      )
      .filter((x) => x !== undefined);
  }

  function resolveSectionLabel(section: Product) {
    return resolveProductConfig(section).librarySectionLabel;
  }
</script>

{#if $appStore.product === Product.NUCLEUS}
  <div class="flex flex-col gap-8 w-full overflow-y-auto">
    {#each sections as section (section)}
      {@const items = resolveResourcesForSection(section)}
      <div class="flex flex-col gap-2">
        {#if section !== Product.NUCLEUS && items.length > 0}
          <div class="text-fgs3 text-b2">
            {resolveSectionLabel(section)}
          </div>
        {/if}
        <div
          class="w-full grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] mo:mb-1 gap-2"
        >
          {#each items as item (item.value)}
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
    <ScrollViewBottomSpacer />
  </div>
{:else}
  <div
    class="w-full grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] mo:mb-1 gap-3"
  >
    {#each options as item (item.value)}
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
