<script lang="ts">
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import LogsPane from "@21n/products/pointron/logs/LogsPane.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { Product } from "@21n/products/product.type";
  import { Size } from "@21n/types/size.enum";
  import { CalendarHistoryTab } from "@21n/components/calendar/calendar.type";
  import CalendarAllActivityPanel from "@21n/components/calendar/column/CalendarAllActivityPanel.svelte";
  import CalendarHistoryNodeEntries from "@21n/components/calendar/column/CalendarHistoryNodeEntries.svelte";
  export let date: Date;
  export let isInline: boolean = false;
  let tab: CalendarHistoryTab = resolveTabSelection();
  $: tabs = resolveTabs($appStore.product);

  function resolveTabSelection() {
    const tabState = uiState.getState(UIState.calendarHistoryTab, {
      scope: UIStateScope.DEVICE
    });
    return tabState ?? CalendarHistoryTab.ALL;
  }

  function onTabSelection(e: CustomEvent) {
    if (!e.detail) return;
    uiState.setState(UIState.calendarHistoryTab, e.detail, {
      scope: UIStateScope.DEVICE
    });
  }

  function resolveTabs(product: Product) {
    const all = {
      label: "All",
      icon: "asterisk",
      value: CalendarHistoryTab.ALL
    };
    const nodes = {
      label: "Nodes",
      icon: "hexagon",
      value: CalendarHistoryTab.NODES
    };
    const focusSessions = {
      label: "Focus",
      icon: "circle",
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
  <div class="flex gap-3 items-center cw:justify-between w-full">
    {#if !isInline}
      <div class="">
        <DatePicker bind:date variant="inline-with-icon" />
      </div>
    {/if}
    <div>
      <OptionSelector
        options={tabs}
        isPreventWrap={true}
        bind:selected={tab}
        on:select={onTabSelection}
        size={Size.sm}
      />
    </div>
  </div>
  <div class="flex flex-grow w-full">
    {#if tab === CalendarHistoryTab.ALL}
      <CalendarAllActivityPanel {date} />
    {:else if tab === CalendarHistoryTab.FOCUS_SESSIONS}
      <LogsPane {date} context="journal" />
    {:else if tab === CalendarHistoryTab.NODES}
      <CalendarHistoryNodeEntries {date} />
    {/if}
  </div>
</div>
