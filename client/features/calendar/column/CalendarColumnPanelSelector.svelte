<script lang="ts">
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "@21n/ui/elements/select/select.type";
  import { CalendarColumnPanel } from "@nucleum/features/calendar/calendar.type";
  import BoxSwitcher from "@21n/ui/elements/switcher/BoxSwitcher.svelte";
  import OptionSelector from "@21n/ui/elements/select/OptionSelector.svelte";
  import { Size } from "@21n/ui/elements/size.enum";

  let {
    panels,
    selectedPanel = $bindable(),
    isBoxed = true
  }: {
    panels: ISelectItem[];
    selectedPanel?: CalendarColumnPanel;
    isBoxed?: boolean;
  } = $props();

  function onPanelSelection(e: CustomEvent) {
    if (!e.detail) return;
    uiState.setState(UIState.calendarColumnPanel, e.detail, {
      scope: UIStateScope.DEVICE
    });
  }
</script>

{#if isBoxed}
  <BoxSwitcher
    options={panels}
    bind:selected={selectedPanel}
    onSelect={onPanelSelection}
    isExpandOnActiveForIcon={true}
  />
{:else}
  <div>
    <OptionSelector
      options={panels}
      size={Size.sm}
      bind:selected={selectedPanel}
      onSelect={onPanelSelection}
      isExpandOnActiveForIcon={true}
      style={OptionSelectorStyle.ICON}
    />
  </div>
{/if}
