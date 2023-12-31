<script lang="ts">
  import { MdContext, type Block } from "$lib/tidy/types/md.type";
  import BlockContent from "./content/BlockContent.svelte";
  import LeftControls from "./LeftControls.svelte";
  import { mdStore } from "./markdown.store";
  export let block: Block;
  export let mdId: string;
</script>

<div class="flex items-center w-full">
  {#if $mdStore.context === MdContext.NODE}
    <LeftControls />
  {/if}
  <BlockContent content={block.content} id={block.id} {mdId} />
</div>
