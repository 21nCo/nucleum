<script lang="ts">
  import type { INode } from "../node.type";
  export let node: INode;
</script>

<button
  class="pdf-thumbnail absolute inset-0 w-full h-full overflow-clip rounded-t-md"
  on:click
>
  <object
    data={node.file?.url + "#toolbar=0&navpanes=0&scrollbar=0&page=1"}
    type="application/pdf"
    width="100%"
    height="100%"
    class="shadow-md overflow-clip rounded-t-md"
    title="PDF Preview"
  >
    <span class="text-fgs3 text-b2"> Preview not available </span>
  </object>
</button>

<style>
  .pdf-thumbnail {
    aspect-ratio: 3/4;
    max-width: 100%;
    max-height: 100%;
  }
</style>
