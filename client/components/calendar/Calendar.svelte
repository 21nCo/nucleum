<script lang="ts">
  import { onMount } from "svelte";
  import BirdCalendar from "./birdViewV2/BirdCalendar.svelte";
  import ClassicCalendar from "./classic/ClassicCalendar.svelte";
  import { CalendarLayout } from "./calendar.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import view from "$lib/client/stores/view.store";
  import CalendarCw from "./CalendarCW.svelte";
  import { setEmbedBg } from "$lib/client/utils/embed.utils";
  export let panel: CalendarLayout = resolvePanelSelection();

  onMount(() => {
    setEmbedBg(1);
  });

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
