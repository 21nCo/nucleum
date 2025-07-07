<script lang="ts">
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { CalendarColumnLayout, CalendarColumnPanel } from "../calendar.type";
  export let panels: ISelectItem[];
  export let selectedPanel: CalendarColumnPanel;
  export let layout: CalendarColumnLayout;
  export let isCwContext: boolean = false;

  function onPanelSelection(e: CustomEvent) {
    if (!e.detail) return;
    uiState.setState(UIState.calendarColumnPanel, e.detail, {
      scope: UIStateScope.DEVICE
    });
  }
</script>

<div
  class={cn({
    "w-full flex justify-center": layout !== CalendarColumnLayout.TABS
  })}
>
  {#if layout === CalendarColumnLayout.TABS}
    <OptionSelector
      options={panels}
      bind:selected={selectedPanel}
      style={panels.length > 2 || isCwContext
        ? OptionSelectorStyle.ICON
        : OptionSelectorStyle.TRAIN}
      size={Size.sm}
      on:select={onPanelSelection}
      isExpandOnActiveForIcon={true}
    />
  {:else if panels.length > 1}
    <PanelSwitcher
      items={panels}
      bind:value={selectedPanel}
      style={PanelSwitcherStyle.TRAIN}
      size={Size.sm}
      activeItemStrength={PanelSwitcherActiveItemStrength.SUBTLE}
    />
  {/if}
</div>
