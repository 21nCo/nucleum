<script lang="ts">
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { OverviewPanel } from "./overview.type";
  let selectedPanel: OverviewPanel = resolveSavedState() ?? OverviewPanel.FOCUS;

  function resolveSavedState() {
    const savedPanel = uiState.getState(UIState.nucleusOverviewPanel, {
      scope: UIStateScope.DEVICE
    });
    if (savedPanel && Object.values(OverviewPanel).includes(savedPanel)) {
      return savedPanel;
    }
  }

  const items = [
    {
      label: "Focus",
      value: OverviewPanel.FOCUS,
      icon: "circle"
    },
    {
      label: "Memory",
      value: OverviewPanel.MEMORY,
      icon: "hexagon"
    }
    // {
    //   label: "Self",
    //   value: OverviewPanel.SELF,
    //   icon: "heart"
    // },
    // {
    //   label: "Finance",
    //   value: OverviewPanel.FINANCE,
    //   icon: "ph:bank-light"
    // }
  ];

  function onSwitch(event: CustomEvent) {
    const val = event.detail;
    if (!val || !Object.values(OverviewPanel).includes(val)) return;
    appStore.toggleSearchParamRecordSpecific("overview", { tab: val });
    uiState.setState(UIState.nucleusOverviewPanel, val, {
      scope: UIStateScope.DEVICE
    });
  }
</script>

<div class="h-full">
  <VerticalSwitcher
    {items}
    selected={selectedPanel}
    itemProps={{ size: Size.sm, activeStatusPlacement: Placement.Right }}
    style={VerticalSwitcherStyle.GRADIENT}
    on:switch={onSwitch}
  />
</div>
