<script lang="ts">
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import type { InputLabel } from "$lib/client/types/input.type";
  import {
    CollectionLayout,
    type ICollectionView
  } from "$lib/client/products/memotron/collection/collection.type";
  import { Size } from "$lib/client/types/size.enum";
  import { collectionLayoutOptions } from "./collection.store";
  export let view: ICollectionView;
  export let properties: DropdownItem[];
  const dropdownSettings: {
    isDisableSearch: boolean;
    width: string;
    size: Size.md | Size.sm;
  } = {
    isDisableSearch: true,
    width: "w-60",
    size: Size.md
  };
  const dropdownLabelConfig: InputLabel = {
    label: "",
    isShrink: true,
    orientation: Orientation.Vertical
  };
</script>

<div
  class="flex flex-col gap-8 bg--bgs2 bg-opacity-50 border border-dashed border-fgs4 rounded-md px-4 py-6 text-left"
>
  <div class="flex flex-wrap gap-6 w-full">
    <DropDown
      label={{ ...dropdownLabelConfig, label: "Layout" }}
      {...dropdownSettings}
      items={collectionLayoutOptions}
      bind:value={view.layout}
      on:select
    />
    <!-- TODO - properties selector - multi select -->
    <DropDown
      label={{ ...dropdownLabelConfig, label: "Properties shown" }}
      {...dropdownSettings}
      items={properties}
      bind:value={view.layout}
      on:select
    />
    <DropDown
      label={{ ...dropdownLabelConfig, label: "Tabs" }}
      {...dropdownSettings}
      items={properties}
      bind:value={view.tabBy}
      on:select
    />
    {#if view.layout === CollectionLayout.BOARD}
      <DropDown
        label={{ ...dropdownLabelConfig, label: "Group by" }}
        {...dropdownSettings}
        items={properties}
        bind:value={view.groupBy}
        on:select
      />
      <DropDown
        label={{ ...dropdownLabelConfig, label: "Sub group by" }}
        {...dropdownSettings}
        items={properties}
        bind:value={view.subGroupBy}
        on:select
      />
    {/if}
  </div>
</div>
