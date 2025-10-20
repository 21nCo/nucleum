<script lang="ts">
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import CalendarLayout from "@21n/components/calendar/CalendarLayout.svelte";

  export let panel: string = "journal";
</script>

<CalendarLayout bind:panel>
  <ComingSoonView />
</CalendarLayout>
