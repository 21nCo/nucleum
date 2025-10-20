<script lang="ts">
  import MarkdownRenderer from "@21n/landing/shared/elements/MarkdownRenderer.svelte";

  export let notes: string;
</script>

<div class="bg-bgs1 p-3 rounded-md border border-brs3">
  <MarkdownRenderer text={notes} />
</div>
