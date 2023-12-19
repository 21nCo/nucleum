<script lang="ts">
  import type { Markdown } from "$lib/tidy/types/md.type";
  import Block from "./Block.svelte";
  import { mdStore } from "./markdown.store";
  export let md: Markdown;
  mdStore.load(md);
</script>

<div class="p-8">
  {#each $mdStore.blocks as block (block.id)}
    <Block {block} />
  {/each}
</div>
