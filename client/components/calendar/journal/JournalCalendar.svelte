<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import CalendarLayout from "../CalendarLayout.svelte";

  export let panel: string = "journal";
</script>

<CalendarLayout bind:panel>
  <ComingSoonView />
</CalendarLayout>
