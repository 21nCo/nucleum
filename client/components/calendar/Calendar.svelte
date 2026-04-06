<script lang="ts">
  import BirdCalendar from "@21n/components/calendar/birdViewV2/BirdCalendar.svelte";
  import ClassicCalendar from "@21n/components/calendar/classic/ClassicCalendar.svelte";
  import { CalendarLayout } from "@21n/components/calendar/calendar.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import view from "@21n/stores/view.store";
  import CalendarCw from "@21n/components/calendar/CalendarCW.svelte";
  let { panel = $bindable(resolvePanelSelection()) }: { panel?: CalendarLayout } =
    $props();

  function resolvePanelSelection() {
    const layoutState = uiState.getState(UIState.calendarLayout, {
      scope: UIStateScope.DAP
    });
    if (layoutState === CalendarLayout.Bird) {
      return CalendarLayout.Classic;
    }
    return layoutState ?? CalendarLayout.Classic;
  }
</script>

{#if $view.isConstrainedWidth}
  <CalendarCw />
{:else if panel === CalendarLayout.Classic}
  <BirdCalendar bind:panel />
{:else if panel === CalendarLayout.Bird}
  <ClassicCalendar bind:panel />
{/if}
