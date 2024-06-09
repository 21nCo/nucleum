<script lang="ts">
  import Streak from "$lib/client/icons/Streak.svelte";
  import { todayFocusStore } from "$lib/client/components/pointron/focus/session.store";
</script>

<button class="flex gap-1 items-center p-2 rounded-lg h-8" on:click>
  <Streak />
  {$todayFocusStore.streak ?? 0} days
</button>
