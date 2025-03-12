<script lang="ts">
  import Birdview from "./birdView/Birdview.svelte";
  import BirdCalendar from "./birdViewV2/BirdCalendar.svelte";
  import ClassicCalendar from "./classic/ClassicCalendar.svelte";
  import JournalCalendar from "./journal/JournalCalendar.svelte";
  import { CalendarLayout } from "./calendar.type";
  export let panel: string = "classic";
</script>

{#if panel === CalendarLayout.Bird}
  <BirdCalendar bind:panel />
{:else if panel === CalendarLayout.Classic}
  <ClassicCalendar bind:panel />
{:else if panel === CalendarLayout.Journal}
  <JournalCalendar bind:panel />
{/if}
