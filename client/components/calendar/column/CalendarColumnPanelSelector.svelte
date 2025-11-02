<script lang="ts">
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { type ISelectItem } from "@21n/types/select.type";
  import { CalendarColumnPanel } from "@21n/components/calendar/calendar.type";
  import BoxSwitcher from "@21n/elements/switcher/BoxSwitcher.svelte";
  export let panels: ISelectItem[];
  export let selectedPanel: CalendarColumnPanel;

  function onPanelSelection(e: CustomEvent) {
    if (!e.detail) return;
    uiState.setState(UIState.calendarColumnPanel, e.detail, {
      scope: UIStateScope.DEVICE
    });
  }
</script>

<BoxSwitcher
  options={panels}
  bind:selected={selectedPanel}
  on:select={onPanelSelection}
  isExpandOnActiveForIcon={true}
/>
