<script lang="ts">
  import type { INode } from "../../node.type";
  import LinkItem from "./LinkItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let links: INode[];
  export let accessPointId: string;
</script>

<div class="flex flex-col gap-2 w-full">
  {#each links as item}
    <LinkItem
      {item}
      {accessPointId}
      on:click={(e) => {
        dispatch("click", { event: e, id: item.id });
      }}
      on:action
    />
  {/each}
</div>
