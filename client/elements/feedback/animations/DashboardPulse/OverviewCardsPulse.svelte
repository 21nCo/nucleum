<script lang="ts">
  export let count: number = 2;
</script>

<div class="grid grid-cols-2 gap-2 animate-pulse w-full h-full">
  {#each Array(count) as _, i}
    <div class="bg-bgs2 rounded-md h-20 dp:h-[7rem] w-full"></div>
  {/each}
</div>
