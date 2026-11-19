<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Readable } from "svelte/store";

  /** Renders the context zone controls one pane registered, as the top bar does. */
  let {
    entries,
    paneId
  }: {
    entries: Readable<
      { pane: { id: string }; key: number; content: Snippet }[]
    >;
    paneId: string;
  } = $props();
</script>

{#each $entries.filter((entry) => entry.pane.id === paneId) as entry (entry.key)}
  {@render entry.content()}
{/each}
