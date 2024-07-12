<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LinkItem from "./LinkItem.svelte";
  const dispatch = createEventDispatcher();
  export let links: string[];
</script>

{#if links?.length > 0}
  <div class="flex gap-2 overflow-x-auto w-full">
    {#each links as item}
      <LinkItem
        id={item}
        on:click={() => {
          dispatch("click", item);
        }}
      />
    {/each}
  </div>
{/if}
