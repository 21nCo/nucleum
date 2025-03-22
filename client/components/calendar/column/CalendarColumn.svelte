<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { Product } from "$lib/client/types/product.type";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { CalendarColumnPanel } from "../calendar.type";
  import CalendarColumnTasksPanel from "./CalendarColumnTasksPanel.svelte";
  import CalendarHistoryPanel from "./CalendarHistoryPanel.svelte";
  import CalendarNotesPanel from "./CalendarNotesPanel.svelte";
  import CalendarOverviewPanel from "./overview/CalendarOverviewPanel.svelte";
  export let scale: TimeScaleUnit;
  export let date: Date;
  let selectedPanel: CalendarColumnPanel = resolvePanelSelection();

  function resolvePanelSelection() {
    const panelState = uiState.getState(UIState.calendarColumnPanel, {
      isDeviceScoped: true,
      isProductScoped: true
    });
    return panelState ?? CalendarColumnPanel.Tasks;
  }
  $: panels = resolvePanels($appStore.product);

  /**
   * Notes on timeline:
   * - Sub timeline (hours for a day, days for a week etc) - Time blocking/slotting
   * - Collapsible all-day events, tasks inbox (collapsible so that timeline is not crowded)
   * - Past days/periods - will be more restrospective, future days will have planned events, tasks etc - current day/period tries to show both
   * - Timeline will move out of panel switcher when enough width is available for the calendar column
   * @param product
   */
  function resolvePanels(product: Product) {
    const timeline = {
      label: "Timeline",
      value: CalendarColumnPanel.Timeline,
      icon: "ph:clock-light"
    };
    const history = {
      label: "History",
      value: CalendarColumnPanel.History,
      icon: "ph:clock-counter-clockwise-light"
    };
    const overview = {
      label: "Overview",
      value: CalendarColumnPanel.Overview,
      icon: "heroicons:rectangle-group"
    };
    const notes = {
      label: "Notes",
      value: CalendarColumnPanel.Notes,
      icon: "ph:note-light"
    };
    const tempTasksPanel = {
      label: "Tasks",
      value: CalendarColumnPanel.Tasks,
      icon: "ph:check-square-light"
    };

    switch (product) {
      case Product.POINTRON:
        return [tempTasksPanel, overview, history];
      case Product.MEMOTRON:
      case Product.NUCLEUS:
        return [tempTasksPanel, notes, history];
      default:
        return [timeline, overview, history];
    }
  }

  function onPanelSelection(e: CustomEvent) {
    if (!e.detail) return;
    uiState.setState(UIState.calendarColumnPanel, e.detail, {
      isDeviceScoped: true,
      isProductScoped: true
    });
  }
</script>

<div class="flex flex-col h-full w-full">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="text-h4 font-medium text-fgs3">
        {formatDate(date)}
      </div>
      |
      <div class="text-b2 text-fgs3">
        {enumToString(selectedPanel)}
      </div>
    </div>
    <div>
      <OptionSelector
        options={panels}
        bind:selected={selectedPanel}
        style={OptionSelectorStyle.ICON}
        size={Size.sm}
        on:select={onPanelSelection}
      />
    </div>
  </div>
  <div class="flex flex-grow w-full py-4">
    {#if selectedPanel === CalendarColumnPanel.Tasks}
      <CalendarColumnTasksPanel {date} />
    {:else if selectedPanel === CalendarColumnPanel.History}
      <CalendarHistoryPanel {date} />
    {:else if selectedPanel === CalendarColumnPanel.Overview}
      <CalendarOverviewPanel {date} />
    {:else if selectedPanel === CalendarColumnPanel.Notes}
      <CalendarNotesPanel {date} {scale} />
    {:else}
      <div class="my-auto">
        <ComingSoonView />
      </div>
    {/if}
  </div>
</div>
