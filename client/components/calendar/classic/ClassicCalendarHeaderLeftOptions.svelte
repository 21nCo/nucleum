<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import Icon from "@21n/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { OptionSelectorStyle } from "@21n/types/select.type";
  import view from "@21n/stores/view.store";
  import { appStore } from "@21n/stores/app.store";
  import { Product } from "@21n/products/product.type";
  import Button from "@21n/elements/button/Button.svelte";
  const dispatch = createEventDispatcher();

  export let selectedView: TimeScaleUnit = TimeScaleUnit.MONTH;
  export let isRefreshing: boolean = false;
  export let parentBgIndex: number = 2;
  const isDev = import.meta.env?.DEV;

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
    icon: "text:E",
    value: "heatmap"
  };
  const switchOptions =
    $appStore.product === Product.MEMOTRON
      ? [monthOption, yearOption]
      : [
          dayOption,
          isDev && weekOption,
          monthOption,
          yearOption,
          isDev && heatmapOption
        ].filter(Boolean);

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
  {#if isDev}
    <Button icon="scope" tooltip="Calendar scope" />
  {/if}
</div>
