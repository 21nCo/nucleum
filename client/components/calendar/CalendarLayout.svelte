<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { CalendarLayout } from "./calendar.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  export let panel: CalendarLayout = CalendarLayout.Classic;

  const panelOptions: ISelectItem[] = [
    { value: CalendarLayout.Classic, label: "Classic" },
    {
      value: CalendarLayout.Bird,
      label: "Columns"
      // badge: "planned",
      // isDisabled: true
    }
  ];
  const dev_enableBirdView = false;

  function onPanelSwitch(event: CustomEvent) {
    if (!event.detail || !Object.values(CalendarLayout).includes(event.detail))
      return;
    uiState.setState(UIState.calendarLayout, event.detail, {
      scope: UIStateScope.DAP
    });
  }
</script>

<div class="flex flex-col h-full w-full">
  <div
    class="flex items-center gap-4 border-b border-brs3 h-[3.2rem] 2k:h-14 px-4 bg-bgs2"
  >
    <header class="grid grid-cols-3 w-full sticky top-0 z-10">
      <div class="flex items-center gap-4">
        {#if $appStore.product === Product.NUCLEUS && dev_enableBirdView}
          <PanelSwitcher
            items={panelOptions}
            bind:value={panel}
            style={PanelSwitcherStyle.TRAIN}
            size={Size.sm}
            on:switch={onPanelSwitch}
          />
        {:else}
          <Text content="Calendar" style={TextStyle.PANEL_HEADING_SMALL} />
        {/if}
        <slot name="header-left-options" />
      </div>
      <slot name="header" />
    </header>
  </div>
  <div class="flex-1 min-h-0">
    <slot />
  </div>
</div>
