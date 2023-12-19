<script lang="ts">
  import type { SpanContent } from "$lib/tidy/types/md.type";
  import SpanContentView from "./SpanContent.svelte";
  export let content: SpanContent[];
</script>

<div>
  {#each content as span (span.id)}
    <SpanContentView {span} />
  {/each}
</div>
