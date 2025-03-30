<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { CalendarLayout } from "./calendar.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  export let panel: CalendarLayout = CalendarLayout.Classic;

  const panelOptions: ISelectItem[] = [
    { value: CalendarLayout.Classic, label: "Classic" },
    { value: CalendarLayout.Journal, label: "Journal" }
    // {
    //   value: CalendarLayout.Bird,
    //   label: "Bird",
    //   badge: "planned",
    //   isDisabled: true
    // }
  ];

  function onPanelSwitch(event: CustomEvent) {
    if (!event.detail || !Object.values(CalendarLayout).includes(event.detail))
      return;
    uiState.setState(UIState.calendarLayout, event.detail, {
      isDeviceScoped: true
    });
  }
</script>

<div class="flex flex-col h-full w-full">
  <div class="p-4 border-b border-brs3 flex items-center gap-4">
    <PanelSwitcher
      items={panelOptions}
      bind:value={panel}
      style={PanelSwitcherStyle.TRAIN}
      size={Size.sm}
      on:switch={onPanelSwitch}
    />
    <slot name="header" />
  </div>
  <div class="flex-1 min-h-0">
    <slot />
  </div>
</div>
