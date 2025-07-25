<script lang="ts">
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import type { InputLabel } from "$lib/client/types/input.type";
  import {
    CollectionLayout,
    type ICollectionView
  } from "$lib/client/components/collection/collection.type";
  import { Size } from "$lib/client/types/size.enum";
  import { collectionLayoutOptions } from "$lib/client/components/collection/collection.store";
  import { createEventDispatcher } from "svelte";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import MultiselectDropdown from "$lib/client/elements/dropdown/MultiselectDropdown.svelte";
  const dispatch = createEventDispatcher();

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
  function onSelect(key: string, e: CustomEvent) {
    dispatch("change", {
      key,
      value: e.detail
    });
  }
</script>

<div
  class="flex flex-col gap-8 bg--bgs2 bg-opacity-50 border border-dashed border-fgs4 rounded-md px-4 py-6 text-left"
>
  <div class="flex flex-wrap gap-6 w-full">
    <!-- <DropDown
      label={{ ...dropdownLabelConfig, label: "Layout" }}
      {...dropdownSettings}
      items={collectionLayoutOptions}
      bind:value={view.layout}
      on:select={(e) => onSelect("layout", e)}
    /> -->
    <div class="w-60">
      <MultiselectDropdown
        options={properties}
        selected={view.properties?.map((x) => x.toString()) ?? []}
        label={{
          ...dropdownLabelConfig,
          label: "Properties shown"
        }}
        on:select={(e) => onSelect("properties", e)}
      />
    </div>
    <DropDown
      label={{ ...dropdownLabelConfig, label: "Tabs" }}
      {...dropdownSettings}
      items={properties}
      value={view.tabBy.toString()}
      on:select={(e) => onSelect("tabBy", e)}
    />
    {#if view.layout === CollectionLayout.BOARD}
      <DropDown
        label={{ ...dropdownLabelConfig, label: "Group by" }}
        {...dropdownSettings}
        items={properties}
        value={view.groupBy.toString()}
        on:select={(e) => onSelect("groupBy", e)}
      />
      <DropDown
        label={{ ...dropdownLabelConfig, label: "Sub group by" }}
        {...dropdownSettings}
        items={properties}
        value={view.subGroupBy.toString()}
        on:select={(e) => onSelect("subGroupBy", e)}
      />
    {/if}
  </div>
  <div class="flex flex-row gap-2 items-center">
    <Badge text="soon" />
    <span class="text-fgs3 text-b3">
      More views like table view, filter and sorting options will be available
      soon.
    </span>
  </div>
</div>
