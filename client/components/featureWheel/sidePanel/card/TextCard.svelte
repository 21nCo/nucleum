<script lang="ts">
  import { renderMdAsHtml } from "../../../markdown/markdown.utils";

  export let title: string;
  export let content: string | undefined = undefined;
</script>

<div class="flex flex-col gap-2 p-4 bg-bgs2 rounded-md">
  <div class="text-h5 font-medium">{title}</div>
  <slot>
    {#if content}
      <div class="text-fgs2 text-b2">
        {@html renderMdAsHtml(content)}
      </div>
    {/if}
  </slot>
</div>
