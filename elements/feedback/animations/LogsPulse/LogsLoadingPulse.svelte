<script lang="ts">
  import LogsPulseItem from "./LogsPulseItem.svelte";
  export let count: number = 0;
  if (count < 1) count = 1;
</script>

<div class="w-full h-full flex flex-col gap-6 animate-pulse">
  {#each Array(count) as _, i}
    <LogsPulseItem />
  {/each}
</div>
