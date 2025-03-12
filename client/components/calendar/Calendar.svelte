<script lang="ts">
  import BirdCalendar from "./birdViewV2/BirdCalendar.svelte";
  import ClassicCalendar from "./classic/ClassicCalendar.svelte";
  import JournalCalendar from "./journal/JournalCalendar.svelte";
  import { CalendarLayout } from "./calendar.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  export let panel: CalendarLayout = resolvePanelSelection();

  function resolvePanelSelection() {
    const layoutState = uiState.getState(UIState.calendarLayout, {
      isDeviceScoped: true
    });
    return layoutState ?? CalendarLayout.Classic;
  }
</script>

{#if panel === CalendarLayout.Bird}
  <BirdCalendar bind:panel />
{:else if panel === CalendarLayout.Classic}
  <ClassicCalendar bind:panel />
{:else if panel === CalendarLayout.Journal}
  <JournalCalendar bind:panel />
{/if}
