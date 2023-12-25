<script lang="ts">
  import type { Markdown, MdContext, MdParams } from "$lib/tidy/types/md.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Block from "./Block.svelte";
  import { mdContentChangeEvent, mdStore } from "./markdown.store";
  export let md: Markdown;
  export let context: MdContext;
  export let params: MdParams | undefined = undefined;
  const dispatch = createEventDispatcher();
  mdStore.load(md, context, params);
  onMount(() => {
    const mdChangeSub = mdContentChangeEvent.subscribe((val) => {
      // console.log("md content changed", val);
      dispatch("change", $mdStore.blocks);
    });
    return () => {
      mdChangeSub();
    };
  });
</script>

<div class="p-8">
  {#each $mdStore.blocks as block (block.id)}
    <Block {block} />
  {/each}
</div>
