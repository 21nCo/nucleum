<script lang="ts">
  import type { INode } from "../../node.type";
  import LinkItem from "./LinkItem.svelte";
  export let links: INode[];
</script>

<div class="flex flex-col gap-2 w-full">
  {#each links as item}
    <LinkItem {item} />
  {/each}
</div>
