<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type {
    IResourceSwitchItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import ResourceSwitcherItem from "./ResourceSwitcherItem.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  import { resolveResourceSwitcher } from "../../flux/resourceStores/resource.utils";
  const dispatch = createEventDispatcher();
  export let resources: Resource[] = [];
  export let selected: ISelectValue | undefined = undefined;
  export let parentBgIndex: number = 1;
  export let isShowCount: boolean = false;
  let refs: Record<Resource, ResourceSwitcherItem> = {};

  const resourceList: IResourceSwitchItem[] = resolveResourceSwitcher();

  let options: IResourceSwitchItem[] = [];

  $: options = resources.map((x) => {
    const resource = resourceList.find((y) => y.value === x);
    if (!resource) return { label: x, value: x, icon: "ph:circle-light" };
    return resource;
  });

  let sections = [
    Product.NUCLEUS,
    Product.POINTRON,
    Product.MEMOTRON
    // Product.SELFTRON,
    // Product.FEEDTRON,
    // Product.HOMETRON,
    // Product.FINATRON,
    // Product.FELLOTRON
  ];
  if (selected === undefined) selected = options[0]?.value;
  export async function refresh(resource: Resource) {
    await refs[resource]?.refresh();
  }

  function resolveResourcesForSection(section: Product) {
    let resources = [];
    switch (section) {
      case Product.NUCLEUS:
        resources = [
          Resource.collection,
          Resource.combination
          // Resource.event
        ];
        break;
      case Product.POINTRON:
        resources = [Resource.goal, Resource.task];
        break;
      case Product.MEMOTRON:
        resources = [Resource.node, Resource.relation];
        break;
      case Product.SELFTRON:
        resources = [Resource.habit, Resource.quest, Resource.input];
        break;
      case Product.FEEDTRON:
        resources = [Resource.source, Resource.feed];
        break;
      case Product.HOMETRON:
        resources = [Resource.thing, Resource.place];
        break;
      case Product.FINATRON:
        resources = [Resource.account];
        break;
      case Product.FELLOTRON:
        resources = [Resource.fellow];
        break;
      default:
        return [];
    }
    return resources
      .map((x) => resourceList.find((y) => y.value === x))
      .filter((x) => x !== undefined);
  }

  function resolveSectionLabel(section: Product) {
    switch (section) {
      case Product.POINTRON:
        return "Focus";
      case Product.MEMOTRON:
        return "Memory";
      case Product.SELFTRON:
        return "Self";
      case Product.FEEDTRON:
        return "Feed";
      case Product.HOMETRON:
        return "Home";
      case Product.FINATRON:
        return "Finance";
      case Product.FELLOTRON:
        return "Fellow";
      default:
        return "";
    }
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
              bind:this={refs[item.value]}
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
        bind:this={refs[item.value]}
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
