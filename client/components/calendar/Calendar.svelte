<script lang="ts">
  import BirdCalendar from "./birdViewV2/BirdCalendar.svelte";
  import ClassicCalendar from "./classic/ClassicCalendar.svelte";
  import JournalCalendar from "./journal/JournalCalendar.svelte";
  import { CalendarLayout } from "./calendar.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import view from "$lib/client/stores/view.store";
  import CalendarCw from "./CalendarCW.svelte";
  export let panel: CalendarLayout = resolvePanelSelection();

  function resolvePanelSelection() {
    const layoutState = uiState.getState(UIState.calendarLayout, {
      isDeviceScoped: true
    });
    return layoutState ?? CalendarLayout.Classic;
  }
</script>

{#if $view.isConstrainedWidth}
  <CalendarCw />
{:else if panel === CalendarLayout.Bird}
  <BirdCalendar bind:panel />
{:else if panel === CalendarLayout.Classic}
  <ClassicCalendar bind:panel />
{:else if panel === CalendarLayout.Journal}
  <JournalCalendar bind:panel />
{/if}
