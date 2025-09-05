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
  import { OverviewPanel } from "./overview.type";

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
      items={[
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
      ]}
      style={PanelSwitcherStyle.BAR}
      title="Overview"
      isExpandToFullWidth={true}
      isShowNumberShortcut={$uiStateDerived.isShowHotKeyHints}
      size={Size.sm}
      bind:value={selectedPanel}
      on:switch={onPanelSwitch}
      isEnableTitleAction={true}
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
