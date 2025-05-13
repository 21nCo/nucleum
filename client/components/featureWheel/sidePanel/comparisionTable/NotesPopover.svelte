<script lang="ts">
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";

  export let notes: string;
</script>

<div class="bg-bgs1 p-3 rounded-md border border-brs3">
  {@html renderMdAsHtml(notes)}
</div>
