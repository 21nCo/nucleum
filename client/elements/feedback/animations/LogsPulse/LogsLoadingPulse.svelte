<script lang="ts">
  import Divider from "@21n/elements/Divider.svelte";
  import LogsPulseItem from "@21n/elements/feedback/animations/LogsPulse/LogsPulseItem.svelte";
    let {
    count = 0,
  }: {
    count?: number;
  } = $props();

  if (count < 1) count = 1;
</script>

<div class="w-full h-full flex flex-col items-center gap-6 animate-pulse">
  <div class="flex flex-col gap-1 w-full max-w-md">
    <div class="flex justify-between px-2 py-1 w-full">
      <span class="w-16 h-3 rounded-md bg-bgs2"></span>
      <span class="w-16 h-3 rounded-md bg-bgs2"></span>
      <span class="w-16 h-3 rounded-md bg-bgs2"></span>
    </div>
    <Divider />
  </div>
  {#each Array(count) as _, i}
    <LogsPulseItem />
  {/each}
</div>
