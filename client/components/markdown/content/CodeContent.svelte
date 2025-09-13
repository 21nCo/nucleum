<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { ICodeBlockBody } from "../md.type";
  import type { MdStoreType } from "../markdown.store";
  import CodeContentUsingMonaco from "./CodeContentUsingMonaco.svelte";
  import CodeContentUsingHighlight from "./CodeContentUsingHighlight.svelte";
  
  export let mdStore: MdStoreType;
  export let body: ICodeBlockBody;
  export let useMonacoEditor: boolean = false;
  
  const dispatch = createEventDispatcher();
</script>

{#if useMonacoEditor}
  <CodeContentUsingMonaco
    {mdStore}
    {body}
    on:update
    on:delete
  />
{:else}
  <CodeContentUsingHighlight
    {mdStore}
    {body}
    on:update
    on:delete
  />
{/if}
