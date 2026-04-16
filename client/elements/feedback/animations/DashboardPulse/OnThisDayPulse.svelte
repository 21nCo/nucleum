<script lang="ts">
    let {
    count = 2,
  }: {
    count?: number;
  } = $props();

</script>

<div class="grid grid-cols-2 gap-2 animate-pulse w-full h-full">
  {#each Array(count) as _, i}
    <div class="bg-bgs2 rounded-md h-20 dp:h-[16rem] w-full"></div>
  {/each}
</div>
