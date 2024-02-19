<script lang="ts">
  import type { Block, MdStore } from "$lib/tidy/types/md.type";
  import { onMount } from "svelte";
  import { getMdStore } from "./markdown.store";
  export let mdId: string;
  export let title: string;
  const mdStore = getMdStore(mdId);
  let mdcontainerID = "markDown-" + mdId;
  let mdContainerHeight: number | undefined;
  let headingBlocks: any;
  let isHeadingAvailable: boolean = false;
  onMount(() => {
    let mdContainerElement = document.getElementById(mdcontainerID);
    mdContainerHeight = mdContainerElement?.offsetHeight;
    const sub = mdStore.subscribe((x: MdStore) => {
      refresh(x.blocks);
    });
    return () => {
      sub();
    };
  });
  function refresh(blocks: Block[]) {
    headingBlocks = blocks
      .filter((block: any) => block.content.type.startsWith("HEADING"))
      .map((block: any) => ({
        content: block.content.body,
        id: "toc-" + block.id,
        HEADING: Number(block.content.type.slice(-1))
      }));
    if (!(headingBlocks.length > 0)) return;
    isHeadingAvailable = true;
  }
</script>

{#if isHeadingAvailable}
  <div
    class="absolute w-1/4 right-0 bottom-0 text-left bg-bgs2"
    style="height:{mdContainerHeight * 0.95}px"
  >
    <div class="sticky top-10 pt-4">
      <p class="text-lg text-fgs2 p-1 truncate">{title.toUpperCase()}</p>
      {#each headingBlocks as block}
        <a
          href="#{block.id.slice(4)}"
          class="block text-base hover:text-bgs4 hover:bg-a1 truncate"
          style="padding-left: {block.HEADING * 15}px;">{block.content}</a
        >
      {/each}
    </div>
  </div>{/if}
