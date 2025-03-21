<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import LogsPane from "$lib/client/products/pointron/logs/LogsPane.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { Product } from "$lib/client/types/product.type";
  import { Size } from "$lib/client/types/size.enum";
  import { CalendarHistoryTab } from "../calendar.type";
  import CalendarAllActivityPanel from "./CalendarAllActivityPanel.svelte";
  export let date: Date;
  let tab: CalendarHistoryTab = resolveTabSelection();
  $: tabs = resolveTabs($appStore.product);

  function resolveTabSelection() {
    const tabState = uiState.getState(UIState.calendarHistoryTab, {
      isDeviceScoped: true
    });
    return tabState ?? CalendarHistoryTab.FOCUS_SESSIONS;
  }

  function onTabSelection(e: CustomEvent) {
    if (!e.detail) return;
    uiState.setState(UIState.calendarHistoryTab, e.detail, {
      isDeviceScoped: true
    });
  }

  function resolveTabs(product: Product) {
    const all = {
      label: "All",
      icon: "ph:asterisk-light",
      value: CalendarHistoryTab.ALL
    };
    const nodes = {
      label: "Nodes",
      icon: "ph:hexagon-light",
      value: CalendarHistoryTab.NODES
    };
    const focusSessions = {
      label: "Focus",
      icon: "ph:circle-light",
      value: CalendarHistoryTab.FOCUS_SESSIONS
    };

    switch (product) {
      case Product.POINTRON:
        return [all, focusSessions];
      case Product.MEMOTRON:
        return [all, nodes];
      case Product.NUCLEUS:
        return [all, nodes, focusSessions];
      default:
        return [all, focusSessions];
    }
  }
</script>

<div class="flex flex-col h-full w-full gap-4">
  <OptionSelector
    options={tabs}
    isPreventWrap={true}
    bind:selected={tab}
    on:select={onTabSelection}
    size={Size.sm}
  />
  <div class="flex flex-grow w-full">
    {#if tab === CalendarHistoryTab.ALL}
      <CalendarAllActivityPanel {date} />
    {:else if tab === CalendarHistoryTab.FOCUS_SESSIONS}
      <LogsPane {date} context="journal" />
    {:else if tab === CalendarHistoryTab.NODES}
      <ComingSoonView />
    {/if}
  </div>
</div>
