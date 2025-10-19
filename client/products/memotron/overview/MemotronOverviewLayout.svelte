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
  import { MemotronOverviewPanel } from "@21n/products/memotron/overview/overview.type";
  import { Product } from "@21n/products/product.type";
  import { appStore } from "@21n/stores/app.store";
  import { cn } from "@21n/utils/ui.utils";

  export let isConstrainedWidth = false;
  let selectedPanel: MemotronOverviewPanel =
    resolveSavedState() ?? MemotronOverviewPanel.GRAPH;
  const isNucleusContext = $appStore.product === Product.NUCLEUS;

  let containerWidth = 0;
  $: isConstrainedWidth = containerWidth < 1000 || $view.isConstrainedWidth;

  function resolveSavedState() {
    const savedPanel = uiState.getState(UIState.memotronOverviewPanel, {
      scope: UIStateScope.DEVICE
    });
    if (
      savedPanel &&
      Object.values(MemotronOverviewPanel).includes(savedPanel)
    ) {
      return savedPanel;
    }
  }

  function onPanelSwitch(event: CustomEvent) {
    if (
      !event.detail ||
      !Object.values(MemotronOverviewPanel).includes(event.detail)
    )
      return;
    uiState.setState(UIState.memotronOverviewPanel, event.detail, {
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
      items={[
        {
          label: "Graph",
          value: MemotronOverviewPanel.GRAPH,
          icon: "graph"
        },
        {
          label: "Map",
          value: MemotronOverviewPanel.MAP,
          icon: "ph:map-pin-light"
        }
      ]}
      style={PanelSwitcherStyle.BAR}
      title={isNucleusContext ? "Memory" : "Overview"}
      isExpandToFullWidth={true}
      size={Size.sm}
      bind:value={selectedPanel}
      on:switch={onPanelSwitch}
      tempTitleWithActionDisabled={true}
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
