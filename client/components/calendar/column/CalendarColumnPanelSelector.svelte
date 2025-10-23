<script lang="ts">
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "@21n/types/select.type";
  import { Size } from "@21n/types/size.enum";
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { CalendarColumnLayout, CalendarColumnPanel } from "@21n/components/calendar/calendar.type";
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
      on:switch={onPanelSelection}
    />
  {/if}
</div>
