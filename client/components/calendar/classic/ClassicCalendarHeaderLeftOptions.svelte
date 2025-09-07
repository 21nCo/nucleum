<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import view from "$lib/client/stores/view.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/products/product.type";
  const dispatch = createEventDispatcher();

  export let selectedView: TimeScaleUnit = TimeScaleUnit.MONTH;
  export let isRefreshing: boolean = false;
  export let parentBgIndex: number = 2;
  const monthOption = {
    label: "Month",
    icon: "text:M",
    value: TimeScaleUnit.MONTH
  };
  const yearOption = {
    label: "Year",
    icon: "text:Y",
    value: TimeScaleUnit.YEAR
  };
  const dayOption = {
    label: "Day",
    icon: "text:D",
    value: TimeScaleUnit.DAY
  };
  const weekOption = {
    label: "Week",
    icon: "text:W",
    value: TimeScaleUnit.WEEK
  };
  const heatmapOption = {
    label: "Heatmap",
    icon: "text:H",
    value: "heatmap"
  };
  const switchOptions =
    $appStore.product === Product.MEMOTRON
      ? [monthOption, yearOption]
      : [
          dayOption,
          // weekOption,
          monthOption,
          yearOption
          // heatmapOption
        ];

  function onScaleSelection(e: CustomEvent) {
    if (!e.detail) return;
    selectedView = e.detail;
    uiState.setState(UIState.classicCalendarScale, selectedView, {
      scope: UIStateScope.DAP
    });
    dispatch("scaleSelection", selectedView);
  }
</script>

<div class="flex items-center gap-2">
  <div>
    {#if $view.isConstrainedWidth}
      <DropDown
        items={switchOptions}
        value={selectedView}
        isDisableSearch={true}
        width="min-w-32"
        size={Size.sm}
        isEnforceWidth={true}
        on:select={onScaleSelection}
      />
    {:else}
      <OptionSelector
        options={switchOptions}
        selected={selectedView}
        size={Size.sm}
        {parentBgIndex}
        isExpandOnActiveForIcon={true}
        style={OptionSelectorStyle.ICON}
        on:select={onScaleSelection}
      />
    {/if}
  </div>
  {#if isRefreshing}
    <Icon icon="svg-spinners:180-ring-with-bg" size={Size.sm} />
  {/if}
</div>
