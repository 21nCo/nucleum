<script lang="ts">
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import CalendarLayout from "@21n/components/calendar/CalendarLayout.svelte";

  let { panel = $bindable("journal") }: { panel?: string } = $props();
</script>

<CalendarLayout bind:panel>
  <ComingSoonView />
</CalendarLayout>
