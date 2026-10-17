<script lang="ts">
  import BirdCalendar from "@nucleum/features/calendar/birdView/BirdCalendar.svelte";
  import ClassicCalendar from "@nucleum/features/calendar/classic/ClassicCalendar.svelte";
  import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import view from "@21n/ui/environment/view.store";
  import CalendarCw from "@nucleum/features/calendar/CalendarCW.svelte";
  let {
    panel = $bindable(resolvePanelSelection())
  }: { panel?: CalendarLayout } = $props();

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
{:else if panel === CalendarLayout.Bird}
  <BirdCalendar bind:panel />
{:else if panel === CalendarLayout.Classic}
  <ClassicCalendar bind:panel />
{/if}
