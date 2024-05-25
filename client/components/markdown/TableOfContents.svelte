<script lang="ts">
  import type { Block, MdStore } from "$lib/client/types/memotron/md.type";
  import { onMount } from "svelte";
  import { getMdStore } from "./markdown.store";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  export let mdId: string;
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
      .filter(
        (block: Block) =>
          block.contentType.startsWith("HEADING") && "body" in block
      )
      .map((block: Block) => ({
        content: block.body,
        id: "toc-" + block.id,
        HEADING: Number(block.contentType.slice(-1))
      }));
    if (!(headingBlocks.length > 0)) return;
    isHeadingAvailable = true;
  }
</script>

{#if isHeadingAvailable}
  <div class="w-full text-left">
    <div class="sticky top-10 pt-4">
      {#each headingBlocks as block}
        <a
          href="#{block.id.slice(4)}"
          class="block text-base hover:text-bgs4 hover:bg-aps1 truncate"
          style="padding-left: {block.HEADING * 15}px;">{block.content}</a
        >
      {/each}
    </div>
  </div>
{/if}
