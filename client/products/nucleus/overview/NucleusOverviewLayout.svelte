<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import view from "@21n/stores/view.store";
  import { resizeListener } from "@21n/actions/resize.action";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import {
    uiState,
    uiStateDerived
  } from "@21n/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import { OverviewPanel } from "@21n/products/product.type";
  import { Product } from "@21n/products/product.type";
  import { resolveProductConfig } from "@21n/products/product.config";

  const overviewPanelSwitcherItems =
    resolveProductConfig(Product.NUCLEUS).overviewPanelSwitcherItems ?? [];

  export let isConstrainedWidth = false;
  let selectedPanel: OverviewPanel = resolveSavedState() ?? OverviewPanel.FOCUS;

  let containerWidth = 0;
  $: isConstrainedWidth = containerWidth < 1000 || $view.isConstrainedWidth;

  function resolveSavedState() {
    const savedPanel = uiState.getState(UIState.nucleusOverviewPanel, {
      scope: UIStateScope.DEVICE
    });
    if (savedPanel && Object.values(OverviewPanel).includes(savedPanel)) {
      return savedPanel;
    }
  }

  function onPanelSwitch(event: CustomEvent) {
    if (!event.detail || !Object.values(OverviewPanel).includes(event.detail))
      return;
    uiState.setState(UIState.nucleusOverviewPanel, event.detail, {
      scope: UIStateScope.DEVICE
    });
  }
</script>

<div class="relative w-full h-full flex flex-col justify-center items-center">
  <div
    class="flex justify-between items-end gap-4 rounded-md w-full"
    use:resizeListener={(e) => {
      containerWidth = e.width;
    }}
  >
    <PanelSwitcher
      items={overviewPanelSwitcherItems}
      style={PanelSwitcherStyle.BAR}
      title="Overview"
      isExpandToFullWidth={true}
      size={Size.sm}
      bind:value={selectedPanel}
      on:switch={onPanelSwitch}
    >
      <div slot="right" class="mr-3">
        <slot name="right" />
      </div>
    </PanelSwitcher>
  </div>
  <div class="relative w-full h-full">
    <slot />
  </div>
</div>
