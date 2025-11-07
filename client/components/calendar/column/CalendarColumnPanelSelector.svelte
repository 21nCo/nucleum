<script lang="ts">
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "@21n/types/select.type";
  import { CalendarColumnPanel } from "@21n/components/calendar/calendar.type";
  import BoxSwitcher from "@21n/elements/switcher/BoxSwitcher.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { Size } from "@21n/types/size.enum";
  export let panels: ISelectItem[];
  export let selectedPanel: CalendarColumnPanel;
  export let isBoxed: boolean = true;

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
    on:select={onPanelSelection}
    isExpandOnActiveForIcon={true}
  />
{:else}
  <div>
    <OptionSelector
      options={panels}
      size={Size.sm}
      bind:selected={selectedPanel}
      on:select={onPanelSelection}
      isExpandOnActiveForIcon={true}
      style={OptionSelectorStyle.ICON}
    />
  </div>
{/if}
