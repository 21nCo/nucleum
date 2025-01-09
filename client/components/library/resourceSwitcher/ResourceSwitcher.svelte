<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import type {
    IResourceSwitchItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import ResourceSwitcherItem from "./ResourceSwitcherItem.svelte";
  import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  const dispatch = createEventDispatcher();
  export let options: IResourceSwitchItem[];
  export let selected: ISelectValue | undefined = undefined;
  export let parentBgIndex: number = 1;
  export let isShowCount: boolean = false;
  let refs: Record<Resource, ResourceSwitcherItem> = {};
  if (selected === undefined) selected = options[0]?.value;
  export async function refresh(resource: Resource) {
    await refs[resource]?.refresh();
  }
</script>

<div
  class="w-full grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] mo:mb-1 gap-4"
>
  {#each options as item, index}
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
