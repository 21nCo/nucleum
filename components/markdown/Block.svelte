<script lang="ts">
  import type { Block } from "$lib/tidy/types/md.type";
  import BlockContent from "./content/BlockContent.svelte";
  import LeftControls from "./LeftControls.svelte";
  export let block: Block;
</script>

<div class="flex items-center">
  <LeftControls />
  <BlockContent {block} />
</div>
