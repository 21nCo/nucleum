<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import view from "$lib/client/stores/view.store";
  import { resizeListener } from "$lib/client/actions/resize.action";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import {
    uiState,
    uiStateDerived
  } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import { MemotronOverviewPanel } from "./overview.type";
  import { Product } from "$lib/client/products/product.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";

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
    class={cn(
      "flex justify-between items-end gap-4 rounded-md w-full bg-bgs2",
      {
        "px-4": isNucleusContext
      }
    )}
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
      parentBgIndex={2}
      isExpandToFullWidth={true}
      isShowNumberShortcut={!isNucleusContext &&
        $uiStateDerived.isShowHotKeyHints}
      isPreventNumberShortcut={isNucleusContext}
      size={Size.sm}
      bind:value={selectedPanel}
      on:switch={onPanelSwitch}
      isEnableTitleAction={true}
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
