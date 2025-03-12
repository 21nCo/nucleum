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
  import { CalendarColumnPanel } from "../calendar.type";
  import CalendarColumnTasksPanel from "./CalendarColumnTasksPanel.svelte";
  import CalendarHistoryPanel from "./CalendarHistoryPanel.svelte";
  export let scale: TimeScaleUnit;
  export let date: Date;
  let selectedPanel: CalendarColumnPanel = resolvePanelSelection();

  function resolvePanelSelection() {
    const panelState = uiState.getState(UIState.calendarColumnPanel, {
      isDeviceScoped: true
    });
    return panelState ?? CalendarColumnPanel.Tasks;
  }

  $: isNucleus = $appStore.product === Product.NUCLEUS;
  $: panels = resolvePanels($appStore.product);

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
        return [tempTasksPanel, overview, notes, history];
      default:
        return [timeline, overview, history];
    }
  }

  function onPanelSelection(e: CustomEvent) {
    if (!e.detail) return;
    uiState.setState(UIState.calendarColumnPanel, e.detail, {
      isDeviceScoped: true
    });
  }
</script>

<div class="flex flex-col h-full">
  <div class="flex items-center justify-between">
    <div class="text-h4 font-medium text-fgs3">
      {formatDate(date)}
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
  {#if selectedPanel === CalendarColumnPanel.Tasks}
    <CalendarColumnTasksPanel {date} />
  {:else if selectedPanel === CalendarColumnPanel.History}
    <CalendarHistoryPanel {date} {isNucleus} />
  {:else}
    <div class="my-auto">
      <ComingSoonView />
    </div>
  {/if}
</div>
