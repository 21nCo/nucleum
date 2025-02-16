<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";

  const calendars = [
    { id: 1, name: "Personal", color: "bg-aps1" },
    { id: 2, name: "Work", color: "bg-ags1" },
    { id: 3, name: "Family", color: "bg-css1" }
  ];
</script>

<aside class="w-64 border-r border-brs3 p-4 flex flex-col gap-6">
  <Button class="w-full">Create Event</Button>

  <div class="flex flex-col gap-2">
    <h3 class="text-b2 font-medium">My Calendars</h3>
    <div class="space-y-1">
      {#each calendars as calendar}
        <div class="flex items-center gap-2">
          <div class={`w-3 h-3 rounded-full ${calendar.color}`} />
          <span class="text-b3">{calendar.name}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Mini calendar would go here -->
  <div class="border border-brs3 rounded-md p-2">
    <div class="text-b4 text-center mb-2">Mini Calendar</div>
  </div>
</aside>
