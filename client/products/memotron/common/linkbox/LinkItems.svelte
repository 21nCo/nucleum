<script lang="ts">
  import LinkItem from "./LinkItem.svelte";

  export let links: string[];
</script>

{#if links?.length > 0}
  <div class="flex gap-2 overflow-x-auto w-full">
    {#each links as item}
      <LinkItem id={item} />
    {/each}
  </div>
{/if}
