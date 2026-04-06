<script lang="ts">
  import DashboardPulseCardItem from "@21n/elements/feedback/animations/DashboardPulse/DashboardPulseCardItem.svelte";
    let {
    count = 0,
  }: {
    count?: number;
  } = $props();

  if (count < 1) count = 4;
</script>

<div class="flex gap-4 flex-wrap w-full h-full animate-pulse">
  {#each Array(count) as _, i}
    <DashboardPulseCardItem />
  {/each}
</div>
