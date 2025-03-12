<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { CalendarHistoryTab } from "../calendar.type";
  export let date: Date;
  export let isNucleus: boolean;
  let tab: CalendarHistoryTab = resolveTabSelection();

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
</script>

<div class="flex flex-col h-full">
  {#if isNucleus}
    <OptionSelector
      options={[
        {
          label: "Focus sessions",
          value: CalendarHistoryTab.FOCUS_SESSIONS
        },
        {
          label: "Nodes",
          value: CalendarHistoryTab.NODES
        }
      ]}
      bind:selected={tab}
      on:select={onTabSelection}
    />
  {/if}
  {#if tab === CalendarHistoryTab.FOCUS_SESSIONS}
    <!-- TODO -->
    session history
  {:else if tab === CalendarHistoryTab.NODES}
    <ComingSoonView />
  {/if}
</div>
