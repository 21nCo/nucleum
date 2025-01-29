<script lang="ts">
  import Birdview from "./birdView/Birdview.svelte";
  import BirdCalendar from "./birdViewV2/BirdCalendar.svelte";
  import ClassicCalendar from "./classic/ClassicCalendar.svelte";
  import JournalCalendar from "./journal/JournalCalendar.svelte";

  export let panel: string = "classic";
</script>

{#if panel === "bird"}
  <BirdCalendar bind:panel />
{:else if panel === "classic"}
  <ClassicCalendar bind:panel />
{:else if panel === "journal"}
  <JournalCalendar bind:panel />
{/if}
