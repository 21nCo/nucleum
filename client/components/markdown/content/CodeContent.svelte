<script lang="ts">
  import type { ICodeBlockBody } from "@21n/components/markdown/md.type";
  import type { MdStoreType } from "@21n/components/markdown/markdown.store";
  // import CodeContentUsingMonaco from "@21n/components/markdown/content/CodeContentUsingMonaco.svelte";
  import CodeContentUsingHighlight from "@21n/components/markdown/content/CodeContentUsingHighlight.svelte";

  export let mdStore: MdStoreType;
  export let body: ICodeBlockBody;
  export let useMonacoEditor: boolean = false;
</script>

{#if useMonacoEditor}
  <!-- <CodeContentUsingMonaco
    {mdStore}
    {body}
    on:update
    on:delete
  /> -->
{:else}
  <CodeContentUsingHighlight {mdStore} {body} on:update on:delete />
{/if}
