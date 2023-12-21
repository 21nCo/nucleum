<script lang="ts">
  import { BlockType, type Block } from "$lib/tidy/types/md.type";
  import TextContent from "./TextContent.svelte";
  export let block: Block;
</script>

<div class="relative flex-grow">
  {#if block.type === BlockType.DIVIDER}
    <div class="w-5/6 h-px bg-brs3 m-4"></div>
  {:else}
    <TextContent {block} />
  {/if}
</div>
